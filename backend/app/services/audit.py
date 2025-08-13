# app/services/audit.py
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from app.models.audit_logs import AuditLog
from sqlalchemy import or_
from sqlalchemy.orm import Session


def _parse_period(
    desde: Optional[str], ate: Optional[str]
) -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    if not desde or not ate:
        return now - timedelta(days=7), now  # default últimos 7 dias
    start = datetime.fromisoformat(desde)
    end = datetime.fromisoformat(ate)
    # inclui o dia inteiro se vier só YYYY-MM-DD
    if end.hour == 0 and end.minute == 0 and end.second == 0:
        end = end + timedelta(days=1) - timedelta(seconds=1)
    return start, end


def _to_dict(row: AuditLog) -> dict:
    def _jsonify(v):
        from datetime import date, datetime
        from uuid import UUID

        if isinstance(v, (datetime, date)):
            return v.isoformat()
        if isinstance(v, UUID):
            return str(v)
        if isinstance(v, dict):
            return {k: _jsonify(x) for k, x in v.items()}
        if isinstance(v, list):
            return [_jsonify(x) for x in v]
        return v

    return {
        "id": str(row.id),
        "usuario_id": str(row.usuario_id) if row.usuario_id else None,
        "entidade_tipo": row.entidade_tipo,
        "entidade_id": str(row.entidade_id) if row.entidade_id else None,
        "acao": row.acao,
        "detalhes": _jsonify(row.detalhes) if row.detalhes is not None else None,
        "ip": row.ip,
        "user_agent": row.user_agent,
        "criado_em": row.criado_em.isoformat() if row.criado_em else None,
    }


def list_audit_logs(
    db: Session,
    current_user_id: UUID,
    *,
    entidade_tipo: Optional[str] = None,
    entidade_id: Optional[UUID] = None,
    acao: Optional[str] = None,
    usuario_id: Optional[UUID] = None,
    desde: Optional[str] = None,
    ate: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    include_system: bool = True,  # inclui logs sem usuario_id (webhooks/jobs)
    scope: str = "actor",  # "actor" (default) ou "all"
) -> dict:
    """
    Lista logs de auditoria com filtros e paginação.
    - scope="actor": restringe a logs do usuário atual (e opcionais do sistema).
    - scope="all": sem restrição por ator (requerer permissão/admin no futuro).
    """
    start, end = _parse_period(desde, ate)

    q = db.query(AuditLog)

    # filtros básicos
    q = q.filter(AuditLog.criado_em.between(start, end))
    if entidade_tipo:
        q = q.filter(AuditLog.entidade_tipo == entidade_tipo)
    if entidade_id:
        q = q.filter(AuditLog.entidade_id == entidade_id)
    if acao:
        q = q.filter(AuditLog.acao == acao)
    if usuario_id:
        q = q.filter(AuditLog.usuario_id == usuario_id)

    # escopo por ator (default)
    if scope == "actor":
        conds = [AuditLog.usuario_id == current_user_id]
        if include_system:
            conds.append(AuditLog.usuario_id.is_(None))
        q = q.filter(or_(*conds))

    q = q.order_by(AuditLog.criado_em.desc())

    # paginação
    page = max(1, int(page))
    page_size = max(1, min(100, int(page_size)))
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": [_to_dict(r) for r in items],
    }
