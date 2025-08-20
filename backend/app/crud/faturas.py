from datetime import date
from uuid import UUID as _UUID

from app.audit.diff import diff_simple, obj_snapshot
from app.audit.logger import audit_log
from app.models.cobrancas import Cobranca
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.schemas.faturas import FaturaCreate, FaturaUpdate
from sqlalchemy import func, update
from sqlalchemy.orm import Session


def _jsonify(o):
    """Converte objetos para formatos serializáveis no JSON de auditoria."""
    from datetime import date as _date
    from datetime import datetime
    from uuid import UUID

    if isinstance(o, (datetime, _date)):
        return o.isoformat()
    if isinstance(o, UUID):
        return str(o)
    if isinstance(o, dict):
        return {k: _jsonify(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return type(o)(_jsonify(v) for v in o)
    return o


def create_fatura(db: Session, usuario_id: _UUID, data: FaturaCreate) -> Fatura | None:
    # força usuário da fatura ser o mesmo da cobrança
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == data.cobranca_id, Cobranca.usuario_id == usuario_id)
        .first()
    )
    if not cobranca:
        return None

    obj = Fatura(
        usuario_id=usuario_id,
        cobranca_id=data.cobranca_id,
        valor=data.valor,
        vencimento=data.vencimento,
        data_pagamento=data.data_pagamento,
        status=data.status,
    )
    db.add(obj)
    db.flush()  # garante obj.id p/ log

    audit_log(
        db,
        entidade_tipo="fatura",
        entidade_id=obj.id,
        acao="create",
        detalhes=_jsonify(
            {
                "cobranca_id": obj.cobranca_id,
                "valor": obj.valor,
                "vencimento": obj.vencimento,
                "status": obj.status,
                "data_pagamento": obj.data_pagamento,
            }
        ),
    )
    db.commit()
    db.refresh(obj)
    return obj


def get_fatura(db: Session, usuario_id: _UUID, fatura_id: _UUID) -> Fatura | None:
    return (
        db.query(Fatura)
        .filter(Fatura.id == fatura_id, Fatura.usuario_id == usuario_id)
        .first()
    )


def list_faturas(
    db: Session,
    usuario_id: _UUID,
    cobranca_id: _UUID | None = None,
    status: FaturaStatusEnum | None = None,
):
    q = db.query(Fatura).filter(Fatura.usuario_id == usuario_id)
    if cobranca_id:
        q = q.filter(Fatura.cobranca_id == cobranca_id)
    if status:
        q = q.filter(Fatura.status == status)
    return q.order_by(Fatura.vencimento.asc()).all()


def update_fatura(
    db: Session, usuario_id: _UUID, fatura_id: _UUID, data: FaturaUpdate
) -> Fatura | None:
    obj = get_fatura(db, usuario_id, fatura_id)
    if not obj:
        return None

    antes = obj_snapshot(obj, ["valor", "vencimento", "data_pagamento", "status"])

    for field, value in data.dict(exclude_unset=True).items():
        setattr(obj, field, value)

    db.add(obj)
    db.flush()

    depois = obj_snapshot(obj, ["valor", "vencimento", "data_pagamento", "status"])
    diff = diff_simple(antes, depois)

    # só loga se houve alguma mudança
    if diff:
        audit_log(
            db,
            entidade_tipo="fatura",
            entidade_id=obj.id,
            acao="update",
            detalhes=_jsonify({"diff": diff}),
        )

    db.commit()
    db.refresh(obj)
    return obj


def delete_fatura(db: Session, usuario_id: _UUID, fatura_id: _UUID) -> bool:
    obj = get_fatura(db, usuario_id, fatura_id)
    if not obj:
        return False

    snap = obj_snapshot(
        obj, ["cobranca_id", "valor", "vencimento", "status", "data_pagamento"]
    )
    db.delete(obj)
    audit_log(
        db,
        entidade_tipo="fatura",
        entidade_id=fatura_id,
        acao="delete",
        detalhes=_jsonify({"antes": snap}),
    )
    db.commit()
    return True


def marcar_fatura_paga(
    db: Session, usuario_id: _UUID, fatura_id: _UUID, data_pagamento: date
) -> Fatura | None:
    obj = get_fatura(db, usuario_id, fatura_id)
    if not obj:
        return None

    antes = obj_snapshot(obj, ["status", "data_pagamento"])

    obj.data_pagamento = data_pagamento
    obj.status = FaturaStatusEnum.pago

    db.add(obj)
    db.flush()

    depois = obj_snapshot(obj, ["status", "data_pagamento"])
    diff = diff_simple(antes, depois)

    # evento específico para relatório/analytics
    audit_log(
        db,
        entidade_tipo="fatura",
        entidade_id=obj.id,
        acao="payment_received",
        detalhes=_jsonify({"diff": diff}),
    )

    db.commit()
    db.refresh(obj)
    return obj


def marcar_faturas_atrasadas(db: Session) -> int:
    """
    Marca como 'atrasado' todas as faturas:
      - com status 'pendente'
      - e vencimento < hoje (CURRENT_DATE)
    Retorna a quantidade de linhas afetadas.
    """
    stmt = (
        update(Fatura)
        .where(
            Fatura.status == FaturaStatusEnum.pendente,
            Fatura.vencimento < func.current_date(),
        )
        .values(status=FaturaStatusEnum.atrasado)
        .execution_options(synchronize_session=False)
    )

    result = db.execute(stmt)
    db.commit()
    return result.rowcount or 0
