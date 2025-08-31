# app/api/routes/admin.py
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from app.core.dependencies import get_current_admin
from app.db.session import get_db

# MODELS
from app.models.feedbacks import Feedback, FeedbackTipo
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.models.models import Cliente, Usuario
from app.models.planos import Plano
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

router = APIRouter(prefix="", tags=["Admin"])


# ------------------------
# utils
# ------------------------
def _is_uuid(v: str) -> bool:
    try:
        uuid.UUID(str(v))
        return True
    except Exception:
        return False


# ------------------------
# /admin/feedbacks
# ------------------------
@router.get("/feedbacks")
def admin_list_feedbacks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    tipo: Optional[FeedbackTipo] = Query(None),
    origem: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Busca em comentário/origem"),
    dt_ini: Optional[datetime] = Query(None),
    dt_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_admin),
):
    qry = db.query(Feedback).options(selectinload(Feedback.usuario))

    if tipo:
        qry = qry.filter(Feedback.tipo == tipo)
    if origem:
        qry = qry.filter(Feedback.origem.ilike(f"%{origem}%"))
    if q:
        like = f"%{q}%"
        qry = qry.filter(
            or_(Feedback.comentario.ilike(like), Feedback.origem.ilike(like))
        )
    if dt_ini:
        qry = qry.filter(Feedback.criado_em >= dt_ini)
    if dt_fim:
        qry = qry.filter(Feedback.criado_em <= dt_fim)

    total = qry.count()
    rows: List[Feedback] = (
        qry.order_by(Feedback.criado_em.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    def to_item(fb: Feedback):
        u = fb.usuario
        return {
            "id": str(fb.id),
            "tipo": fb.tipo.value if fb.tipo else None,
            "rating": fb.rating,
            "comentario": fb.comentario,
            "origem": fb.origem,
            "contexto": fb.contexto or {},
            "criado_em": fb.criado_em.isoformat() if fb.criado_em else None,
            "usuario": {
                "id": str(u.id) if u else None,
                "nome": u.nome if u else None,
                "email": u.email if u else None,
            },
        }

    return {
        "items": [to_item(fb) for fb in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "tipos": [t.value for t in FeedbackTipo],
    }


# ------------------------
# /admin/usuarios
# ------------------------
@router.get("/usuarios")
def admin_list_usuarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    q: Optional[str] = Query(None, description="Busca por nome/email/documento"),
    plano: Optional[str] = Query(None, description="ID (UUID) ou nome do plano"),
    canal: Optional[str] = Query(
        None, description="email|sms|zap (filtra por flags do plano)"
    ),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_admin),
):
    """
    Lista usuários com métricas por usuário:
      - lembretes_ativos, lembretes_total, clientes_total, envios_30d
    Filtros:
      - q: nome/email/documento
      - plano: UUID de plano ou nome (ilike)
      - canal: 'email'|'sms'|'zap' (usa flags do Plano)
    """

    # Base (para filtros + paginação) — NÃO traga objetos ainda
    base = db.query(Usuario).outerjoin(Plano, Plano.id == Usuario.plano_id)

    if q:
        like = f"%{q}%"
        base = base.filter(
            or_(
                Usuario.nome.ilike(like),
                Usuario.email.ilike(like),
                Usuario.documento.ilike(like),
            )
        )

    if plano:
        if _is_uuid(plano):
            try:
                plano_uuid = uuid.UUID(plano)
                base = base.filter(Plano.id == plano_uuid)
            except Exception:
                base = base.filter(Plano.nome.ilike(f"%{plano}%"))
        else:
            base = base.filter(Plano.nome.ilike(f"%{plano}%"))

    if canal:
        c = canal.strip().lower()
        if c == "email":
            base = base.filter(Plano.usa_email.is_(True))
        elif c == "sms":
            base = base.filter(Plano.usa_sms.is_(True))
        elif c in ("zap", "whatsapp", "wa"):
            base = base.filter(Plano.usa_zap.is_(True))

    # Total (distinto por usuário)
    total = base.with_entities(func.count(func.distinct(Usuario.id))).scalar() or 0

    # Páginação via IDs (evita duplicação por join)
    order_col = (
        Usuario.created_at.desc()
        if hasattr(Usuario, "created_at")
        else Usuario.nome.asc()
    )
    ids_page = [
        r[0]
        for r in (
            base.with_entities(Usuario.id)
            .order_by(order_col)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
    ]

    if not ids_page:
        return {
            "items": [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "planos": [],
        }

    # Carrega os usuários da página com o plano (sem N+1)
    users = (
        db.query(Usuario)
        .options(selectinload(Usuario.plano))
        .filter(Usuario.id.in_(ids_page))
        .all()
    )
    users_by_id = {u.id: u for u in users}
    rows: List[Usuario] = [users_by_id[i] for i in ids_page if i in users_by_id]

    # Métricas em lote (sem N+1)
    dt_ini = datetime.utcnow() - timedelta(days=30)

    # lembretes ativos
    map_lemb_ativos = dict(
        db.query(Lembrete.usuario_id, func.count(Lembrete.id))
        .filter(Lembrete.usuario_id.in_(ids_page), Lembrete.ativa.is_(True))
        .group_by(Lembrete.usuario_id)
        .all()
    )

    # lembretes total
    map_lemb_total = dict(
        db.query(Lembrete.usuario_id, func.count(Lembrete.id))
        .filter(Lembrete.usuario_id.in_(ids_page))
        .group_by(Lembrete.usuario_id)
        .all()
    )

    # clientes total
    map_clientes_total = dict(
        db.query(Cliente.usuario_id, func.count(Cliente.id))
        .filter(Cliente.usuario_id.in_(ids_page))
        .group_by(Cliente.usuario_id)
        .all()
    )

    # envios 30d (enviado_at OU delivered_at nos últimos 30 dias)
    map_envios_30d = dict(
        db.query(Lembrete.usuario_id, func.count(LembreteOcorrencia.id))
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(
            Lembrete.usuario_id.in_(ids_page),
            or_(
                LembreteOcorrencia.enviado_at >= dt_ini,
                LembreteOcorrencia.delivered_at >= dt_ini,
            ),
        )
        .group_by(Lembrete.usuario_id)
        .all()
    )

    # Monta resposta
    items = []
    for u in rows:
        plano_obj = getattr(u, "plano", None)
        items.append(
            {
                "id": str(u.id),
                "nome": u.nome,
                "email": u.email,
                "telefone": getattr(u, "telefone", None),
                "documento": getattr(u, "documento", None),
                "plano": {
                    "id": str(plano_obj.id) if plano_obj else None,
                    "nome": getattr(plano_obj, "nome", None),
                },
                "limites": getattr(plano_obj, "limites", None),
                "usa_email": bool(getattr(plano_obj, "usa_email", False)),
                "usa_sms": bool(getattr(plano_obj, "usa_sms", False)),
                "usa_zap": bool(getattr(plano_obj, "usa_zap", False)),
                "lembretes_ativos": int(map_lemb_ativos.get(u.id, 0)),
                "lembretes_total": int(map_lemb_total.get(u.id, 0)),
                "clientes_total": int(map_clientes_total.get(u.id, 0)),
                "envios_30d": int(map_envios_30d.get(u.id, 0)),
                "created_at": (
                    u.created_at.isoformat() if getattr(u, "created_at", None) else None
                ),
                "last_login": (
                    u.last_login.isoformat() if getattr(u, "last_login", None) else None
                ),
            }
        )

    # Planos para filtro
    planos_rows = db.query(Plano.id, Plano.nome).order_by(Plano.nome.asc()).all()
    planos = [{"id": str(pid), "nome": pnome} for (pid, pnome) in planos_rows]

    return {
        "items": items,
        "total": int(total),
        "page": page,
        "page_size": page_size,
        "planos": planos,
    }


# ------------------------
# /admin/usuarios/metrics
# ------------------------
@router.get("/usuarios/metrics")
def admin_usuarios_metrics(
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_admin),
):
    """
    Cards do topo:
      - total_usuarios
      - lembretes_ativos_total
      - envios_30d_total
      - por_plano: [{ plano, count }]
    """
    total_usuarios = db.query(func.count(Usuario.id)).scalar() or 0

    lembretes_ativos_total = (
        db.query(func.count(Lembrete.id)).filter(Lembrete.ativa.is_(True)).scalar() or 0
    )

    dt_ini = datetime.utcnow() - timedelta(days=30)
    envios_30d_total = (
        db.query(func.count(LembreteOcorrencia.id))
        .filter(
            or_(
                LembreteOcorrencia.enviado_at >= dt_ini,
                LembreteOcorrencia.delivered_at >= dt_ini,
            )
        )
        .scalar()
        or 0
    )

    por_plano_rows = (
        db.query(Plano.nome, func.count(Usuario.id))
        .outerjoin(Usuario, Usuario.plano_id == Plano.id)
        .group_by(Plano.nome)
        .order_by(Plano.nome.asc())
        .all()
    )
    por_plano = [
        {"plano": nome or "—", "count": int(cnt or 0)} for (nome, cnt) in por_plano_rows
    ]

    return {
        "total_usuarios": int(total_usuarios),
        "lembretes_ativos_total": int(lembretes_ativos_total),
        "envios_30d_total": int(envios_30d_total),
        "por_plano": por_plano,
    }
