# app/crud/usuarios.py
from app.audit.logger import audit_log
from app.core.security import hash_password, verify_password
from app.models.models import Usuario
from app.schemas.usuarios import UsuarioCreate
from fastapi import HTTPException
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


def get_usuario_by_id(db: Session, usuario_id) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_usuario_by_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_usuario_by_documento(db: Session, documento: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.documento == documento).first()


def create_usuario(db: Session, data: UsuarioCreate) -> Usuario:
    # unicidade (igual ao endpoint original)
    if get_usuario_by_email(db, data.email):
        audit_log(db, "usuario", None, "create_conflict", {"email": data.email})
        db.commit()
        raise HTTPException(status_code=400, detail="Email já cadastrado.")
    if get_usuario_by_documento(db, data.documento):
        audit_log(db, "usuario", None, "create_conflict", {"documento": data.documento})
        db.commit()
        raise HTTPException(status_code=400, detail="Documento já cadastrado.")

    obj = Usuario(
        nome=data.nome,
        email=data.email,
        telefone=data.telefone,
        documento=data.documento,
        senha_hash=hash_password(data.senha),
    )
    db.add(obj)
    db.flush()  # garante obj.id p/ log

    audit_log(
        db,
        entidade_tipo="usuario",
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


def authenticate_user(db: Session, email: str, senha: str) -> Usuario | None:
    user = get_usuario_by_email(db, email)
    if not user or not verify_password(senha, user.senha_hash):
        audit_log(db, "usuario", None, "login_failed", {"email": email})
        db.commit()
        return None

    audit_log(db, "usuario", user.id, "login", {"email": user.email})
    db.commit()
    return user
