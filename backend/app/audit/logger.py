from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from app.models.audit_logs import AuditLog

from .context import actor_id_ctx, request_ctx


def _to_jsonable(x):
    if isinstance(x, Decimal):
        # escolha: float() para cálculos; str(x) se quiser 100% fiel
        return float(x)
    if isinstance(x, Enum):
        return x.value
    if isinstance(x, (UUID,)):
        return str(x)
    if isinstance(x, (date, datetime)):
        return x.isoformat()
    if isinstance(x, dict):
        return {k: _to_jsonable(v) for k, v in x.items()}
    if isinstance(x, (list, tuple, set)):
        return [_to_jsonable(v) for v in x]
    return x


def audit_log(
    db, entidade_tipo: str, entidade_id, acao: str, detalhes: dict | None = None
):
    user_id = actor_id_ctx.get()
    req = request_ctx.get()
    ip = getattr(getattr(req, "client", None), "host", None) if req else None
    ua = req.headers.get("user-agent") if req else None
    detalhes = _to_jsonable(detalhes) if detalhes is not None else None
    db.add(
        AuditLog(
            usuario_id=user_id,
            entidade_tipo=entidade_tipo,
            entidade_id=entidade_id,
            acao=acao,
            detalhes=detalhes or None,
            ip=ip,
            user_agent=ua,
        )
    )
    # sem commit aqui — o CRUD dá 1 commit pra tudo
