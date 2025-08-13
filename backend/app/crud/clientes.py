from uuid import UUID as _UUID

from app.audit.diff import diff_simple, obj_snapshot
from app.audit.logger import audit_log
from app.models.models import Cliente
from app.schemas.clientes import ClienteCreate
from sqlalchemy.orm import Session


def _jsonify(o):
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


# CREATE
def create_cliente(db: Session, usuario_id: _UUID, data: ClienteCreate) -> Cliente:
    obj = Cliente(
        usuario_id=usuario_id,
        nome=data.nome,
        email=data.email,
        telefone=data.telefone,
        documento=data.documento,
    )
    db.add(obj)
    db.flush()  # garante obj.id p/ log

    audit_log(
        db,
        entidade_tipo="cliente",
        entidade_id=obj.id,
        acao="create",
        detalhes=_jsonify(
            {
                "nome": obj.nome,
                "email": obj.email,
                "telefone": obj.telefone,
                "documento": obj.documento,
            }
        ),
    )
    db.commit()
    db.refresh(obj)
    return obj


# READ (list/get)
def list_clientes(db: Session, usuario_id: _UUID):
    return db.query(Cliente).filter(Cliente.usuario_id == usuario_id).all()


def get_cliente(db: Session, usuario_id: _UUID, cliente_id: _UUID) -> Cliente | None:
    return (
        db.query(Cliente)
        .filter(Cliente.id == cliente_id, Cliente.usuario_id == usuario_id)
        .first()
    )


# UPDATE
def update_cliente(
    db: Session, usuario_id: _UUID, cliente_id: _UUID, data: ClienteCreate
) -> Cliente | None:
    obj = get_cliente(db, usuario_id, cliente_id)
    if not obj:
        return None

    antes = obj_snapshot(obj, ["nome", "email", "telefone", "documento"])

    obj.nome = data.nome
    obj.email = data.email
    obj.telefone = data.telefone
    obj.documento = data.documento

    db.add(obj)
    db.flush()

    depois = obj_snapshot(obj, ["nome", "email", "telefone", "documento"])
    diff = diff_simple(antes, depois)
    if diff:
        audit_log(
            db,
            entidade_tipo="cliente",
            entidade_id=obj.id,
            acao="update",
            detalhes=_jsonify({"diff": diff}),
        )

    db.commit()
    db.refresh(obj)
    return obj


# DELETE (opcional — deixe pronto pro futuro)
def delete_cliente(db: Session, usuario_id: _UUID, cliente_id: _UUID) -> bool:
    obj = get_cliente(db, usuario_id, cliente_id)
    if not obj:
        return False

    snap = obj_snapshot(obj, ["nome", "email", "telefone", "documento"])
    db.delete(obj)
    audit_log(
        db,
        entidade_tipo="cliente",
        entidade_id=cliente_id,
        acao="delete",
        detalhes=_jsonify({"antes": snap}),
    )
    db.commit()
    return True
