# app/services/cobrancas.py
from uuid import UUID as _UUID

from app.audit.diff import diff_simple, obj_snapshot
from app.audit.logger import audit_log
from app.crud.lembretes import existe_lembrete_ativo_para_cobranca
from app.models.cobrancas import Cobranca
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.schemas.cobrancas import CobrancaCreate, CobrancaUpdate
from sqlalchemy.orm import Session, selectinload


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


def create_cobranca(db: Session, usuario_id: _UUID, data: CobrancaCreate) -> Cobranca:
    obj = Cobranca(
        usuario_id=usuario_id,
        titulo=data.titulo,
        descricao=data.descricao,
        cliente_id=data.cliente_id,
        cliente_nome_avulso=data.cliente_nome_avulso,
        valor=data.valor,
        recorrencia=data.recorrencia,
        vencimento=data.vencimento,
    )
    db.add(obj)
    db.flush()  # garante obj.id para log e FK da fatura

    # cria fatura inicial já com usuario_id
    f0 = Fatura(
        usuario_id=usuario_id,
        cobranca_id=obj.id,
        valor=data.valor,
        vencimento=data.vencimento,
        status=FaturaStatusEnum.pendente,
    )
    db.add(f0)
    db.flush()  # garante f0.id para log

    # audit: cobrança criada
    audit_log(
        db,
        entidade_tipo="cobranca",
        entidade_id=obj.id,
        acao="create",
        detalhes=_jsonify(
            {
                "cliente_id": obj.cliente_id,
                "cliente_nome_avulso": obj.cliente_nome_avulso,
                "valor": obj.valor,
                "recorrencia": obj.recorrencia,
                "vencimento": obj.vencimento,
                "fatura_inicial_id": f0.id,
            }
        ),
    )

    # audit: fatura inicial criada (útil para relatórios)
    audit_log(
        db,
        entidade_tipo="fatura",
        entidade_id=f0.id,
        acao="create",
        detalhes=_jsonify(
            {
                "via_cobranca_create": True,
                "cobranca_id": obj.id,
                "valor": f0.valor,
                "vencimento": f0.vencimento,
                "status": f0.status,
            }
        ),
    )

    db.commit()
    db.refresh(obj)
    return obj


def get_cobranca(db: Session, usuario_id: _UUID, cobranca_id: _UUID) -> Cobranca | None:
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == cobranca_id, Cobranca.usuario_id == usuario_id)
        .first()
    )
    if not cobranca:
        return None

    tem_lembrete_ativo = existe_lembrete_ativo_para_cobranca(
        db, usuario_id, cobranca_id
    )
    setattr(cobranca, "tem_lembrete_ativo", bool(tem_lembrete_ativo))
    return cobranca


def list_cobrancas(db: Session, usuario_id: _UUID):
    # 1) Buscar as cobranças do usuário (com o que você já carrega)
    cobrancas: list[Cobranca] = (
        db.query(Cobranca)
        .options(
            selectinload(Cobranca.clientes)
        )  # se for singular, use Cobranca.cliente
        .filter(Cobranca.usuario_id == usuario_id)
        .order_by(Cobranca.data_criacao.desc())
        .all()
    )

    if not cobrancas:
        return []

    # 2) Pegar os IDs das cobranças
    cobranca_ids = [c.id for c in cobrancas]

    # 3) Descobrir, em UMA query, quais cobranças têm ALGUM lembrete ativo
    #    via Fatura -> Lembrete(ativa=True), restrito ao usuário.
    #    Opção A (mais portátil): DISTINCT
    rows = (
        db.query(Fatura.cobranca_id)
        .join(Lembrete, Lembrete.fatura_id == Fatura.id)
        .filter(
            Fatura.cobranca_id.in_(cobranca_ids),
            Lembrete.usuario_id == usuario_id,
            Lembrete.ativa.is_(True),
        )
        .distinct()
        .all()
    )
    cobrancas_com_ativo = {row[0] for row in rows}  # set de cobranca_id

    # 4) Anexar a flag em memória (sem tocar no schema/colunas)
    for c in cobrancas:
        setattr(c, "tem_lembrete_ativo", c.id in cobrancas_com_ativo)

    return cobrancas


def update_cobranca(
    db: Session, usuario_id: _UUID, cobranca_id: _UUID, data: CobrancaUpdate
) -> Cobranca | None:
    obj = get_cobranca(db, usuario_id, cobranca_id)
    if not obj:
        return None

    # snapshot antes
    antes = obj_snapshot(
        obj,
        [
            "titulo",
            "descricao",
            "cliente_id",
            "cliente_nome_avulso",
            "valor",
            "recorrencia",
            "vencimento",
        ],
    )

    for field, value in data.dict(exclude_unset=True).items():
        setattr(obj, field, value)

    db.add(obj)
    db.flush()

    # snapshot depois + diff
    depois = obj_snapshot(
        obj,
        [
            "titulo",
            "descricao",
            "cliente_id",
            "cliente_nome_avulso",
            "valor",
            "recorrencia",
            "vencimento",
        ],
    )
    diff = diff_simple(antes, depois)
    if diff:
        audit_log(
            db,
            entidade_tipo="cobranca",
            entidade_id=obj.id,
            acao="update",
            detalhes=_jsonify({"diff": diff}),
        )

    db.commit()
    db.refresh(obj)
    return obj


def delete_cobranca(db: Session, usuario_id: _UUID, cobranca_id: _UUID) -> bool:
    obj = get_cobranca(db, usuario_id, cobranca_id)
    if not obj:
        return False

    snap = obj_snapshot(
        obj,
        [
            "titulo",
            "cliente_id",
            "cliente_nome_avulso",
            "valor",
            "recorrencia",
            "vencimento",
        ],
    )
    db.delete(obj)

    audit_log(
        db,
        entidade_tipo="cobranca",
        entidade_id=cobranca_id,
        acao="delete",
        detalhes=_jsonify({"antes": snap}),
    )

    db.commit()
    return True
