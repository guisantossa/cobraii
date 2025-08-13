from app.audit.deps import use_audit_context
from app.v1.endpoints import (
    admin_lembretes,
    analytics,
    clientes,
    cobrancas,
    faturas,
    lembretes,
)
from app.v1.endpoints import logs as logs_ep
from app.v1.endpoints import templates, usuarios
from fastapi import APIRouter, Depends

api_router = APIRouter()
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(
    clientes.router,
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(
    cobrancas.router,
    prefix="/cobrancas",
    tags=["Cobranças"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(
    faturas.router,
    prefix="/faturas",
    tags=["Faturas"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(
    lembretes.router,
    prefix="/lembretes",
    tags=["Lembretes"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(
    admin_lembretes.router,
    prefix="",
    tags=["Admin Lembretes"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(
    templates.router,
    prefix="/templates",
    tags=["Templates"],
    dependencies=[Depends(use_audit_context)],
)
api_router.include_router(analytics.router, dependencies=[Depends(use_audit_context)])
api_router.include_router(logs_ep.router, dependencies=[Depends(use_audit_context)])
