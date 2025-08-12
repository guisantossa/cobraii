from uuid import UUID as _UUID

from app.models.cobrancas import Cobranca
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.schemas.cobrancas import CobrancaCreate, CobrancaUpdate
from sqlalchemy.orm import Session, selectinload


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
    db.flush()  # garante id

    # cria fatura inicial já com usuario_id
    db.add(
        Fatura(
            usuario_id=usuario_id,
            cobranca_id=obj.id,
            valor=data.valor,
            vencimento=data.vencimento,
            status=FaturaStatusEnum.pendente,
        )
    )

    db.commit()
    db.refresh(obj)
    return obj


def get_cobranca(db: Session, usuario_id: _UUID, cobranca_id: _UUID) -> Cobranca | None:
    return (
        db.query(Cobranca)
        .filter(Cobranca.id == cobranca_id, Cobranca.usuario_id == usuario_id)
        .first()
    )


def list_cobrancas(db: Session, usuario_id: _UUID):
    return (
        db.query(Cobranca)
        .options(selectinload(Cobranca.clientes))
        .filter(Cobranca.usuario_id == usuario_id)
        .order_by(Cobranca.data_criacao.desc())
        .all()
    )


def update_cobranca(
    db: Session, usuario_id: _UUID, cobranca_id: _UUID, data: CobrancaUpdate
) -> Cobranca | None:
    obj = get_cobranca(db, usuario_id, cobranca_id)
    if not obj:
        return None
    for field, value in data.dict(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_cobranca(db: Session, usuario_id: _UUID, cobranca_id: _UUID) -> bool:
    obj = get_cobranca(db, usuario_id, cobranca_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
