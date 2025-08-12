from datetime import date
from uuid import UUID as _UUID

from app.models.cobrancas import Cobranca
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.schemas.faturas import FaturaCreate, FaturaUpdate
from sqlalchemy.orm import Session


def create_fatura(db: Session, usuario_id: _UUID, data: FaturaCreate) -> Fatura | None:
    # força usuário da fatura ser o mesmo da cobrança
    cobranca = (
        db.query(Cobranca)
        .filter(
            Cobranca.id == data.cobranca_id,
            Cobranca.usuario_id == usuario_id,
        )
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
    for field, value in data.dict(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_fatura(db: Session, usuario_id: _UUID, fatura_id: _UUID) -> bool:
    obj = get_fatura(db, usuario_id, fatura_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def marcar_fatura_paga(
    db: Session, usuario_id: _UUID, fatura_id: _UUID, data_pagamento: date
) -> Fatura | None:
    obj = get_fatura(db, usuario_id, fatura_id)
    if not obj:
        return None
    obj.data_pagamento = data_pagamento
    obj.status = FaturaStatusEnum.pago
    db.commit()
    db.refresh(obj)
    return obj
