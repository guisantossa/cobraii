from app.models.audit_logs import AuditLog

from .context import actor_id_ctx, request_ctx


def audit_log(
    db, entidade_tipo: str, entidade_id, acao: str, detalhes: dict | None = None
):
    user_id = actor_id_ctx.get()
    req = request_ctx.get()
    ip = getattr(getattr(req, "client", None), "host", None) if req else None
    ua = req.headers.get("user-agent") if req else None

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
