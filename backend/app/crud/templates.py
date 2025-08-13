# app/crud/templates.py
import re
from typing import List, Optional, Tuple

from app.audit.diff import diff_simple, obj_snapshot
from app.audit.logger import audit_log
from app.models.templates import TemplateMensagem
from app.schemas.templates import TemplateCreate, TemplateUpdate
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

# Regex para capturar placeholders do tipo {{ Nome }} ou {{nome_campo}}
PLACEHOLDER_RE = re.compile(r"\{\{\s*([A-Za-z0-9_.]+)\s*\}\}")


def extract_placeholders(corpo: str) -> List[str]:
    """Extrai placeholders únicos preservando a ordem de primeira aparição."""
    seen = set()
    ordered: List[str] = []
    for match in PLACEHOLDER_RE.finditer(corpo or ""):
        key = match.group(1)
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    return ordered


# -------------------------
# CRUD
# -------------------------


def create_template(
    db: Session,
    usuario_id,
    data: TemplateCreate,
) -> TemplateMensagem:
    placeholders = extract_placeholders(data.corpo)
    obj = TemplateMensagem(
        usuario_id=usuario_id,
        titulo=data.titulo.strip(),
        corpo=data.corpo,
        canal=data.canal,
        placeholders=placeholders or None,
    )
    db.add(obj)
    db.flush()  # garante obj.id para o log
    audit_log(
        db,
        entidade_tipo="template",
        entidade_id=obj.id,
        acao="create",
        detalhes={
            "titulo": obj.titulo,
            "canal": obj.canal,
            "placeholders": obj.placeholders,
        },
    )
    db.commit()
    db.refresh(obj)
    return obj


def get_template_by_id(
    db: Session,
    usuario_id,
    template_id,
) -> Optional[TemplateMensagem]:
    return (
        db.query(TemplateMensagem)
        .filter(
            TemplateMensagem.id == template_id,
            TemplateMensagem.usuario_id == usuario_id,
        )
        .first()
    )


def list_templates(
    db: Session,
    usuario_id,
    page: int = 1,
    page_size: int = 20,
    canal: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[int, List[TemplateMensagem]]:
    """
    Retorna (total, items) com filtros opcionais.
    - canal: "whatsapp" | "email" | "sms" | "todos"
    - search: busca em título e corpo (ilike)
    """
    query = db.query(TemplateMensagem).filter(TemplateMensagem.usuario_id == usuario_id)

    if canal:
        query = query.filter(TemplateMensagem.canal == canal)

    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            func.lower(TemplateMensagem.titulo).ilike(func.lower(like))
            | func.lower(TemplateMensagem.corpo).ilike(func.lower(like))
        )

    total = query.count()

    items = (
        query.order_by(desc(TemplateMensagem.criado_em))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return total, items


def update_template(
    db: Session,
    usuario_id,
    template_id,
    data: TemplateUpdate,
) -> Optional[TemplateMensagem]:
    obj = get_template_by_id(db, usuario_id, template_id)
    if not obj:
        return None

    antes = obj_snapshot(obj, ["titulo", "corpo", "canal", "placeholders"])

    if data.titulo is not None:
        obj.titulo = data.titulo.strip()

    # Se corpo vier no update, recalcula placeholders
    if data.corpo is not None:
        obj.corpo = data.corpo
        obj.placeholders = extract_placeholders(data.corpo) or None

    if data.canal is not None:
        obj.canal = data.canal

    # Opcionalmente permitir sobrescrever placeholders manualmente
    if data.placeholders is not None:
        obj.placeholders = data.placeholders or None

    db.flush()
    depois = obj_snapshot(obj, ["titulo", "corpo", "canal", "placeholders"])
    audit_log(
        db,
        entidade_tipo="template",
        entidade_id=obj.id,
        acao="update",
        detalhes={"diff": diff_simple(antes, depois)},
    )
    db.commit()
    db.refresh(obj)
    return obj


def delete_template(
    db: Session,
    usuario_id,
    template_id,
) -> bool:
    obj = get_template_by_id(db, usuario_id, template_id)
    if not obj:
        return False
    snap = obj_snapshot(obj, ["titulo", "canal", "placeholders"])
    db.delete(obj)
    audit_log(
        db,
        entidade_tipo="template",
        entidade_id=template_id,
        acao="delete",
        detalhes={"antes": snap},
    )
    db.commit()
    return True
