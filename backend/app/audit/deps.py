from app.core.dependencies import get_current_user
from app.models.models import Usuario
from fastapi import Depends, Request

from .context import actor_id_ctx, request_ctx


async def use_audit_context(
    request: Request, usuario: Usuario = Depends(get_current_user)
):
    t1 = actor_id_ctx.set(getattr(usuario, "id", None))
    t2 = request_ctx.set(request)
    try:
        yield
    finally:
        actor_id_ctx.reset(t1)
        request_ctx.reset(t2)
