from app.v1.endpoints import (
    clientes,
    cobrancas,
    internal,
    lembretes,
    notificacoes,
    pagamentos,
    repasse,
    usuarios,
    webhooks,
)
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(clientes.router, prefix="/clientes", tags=["Clientes"])
api_router.include_router(cobrancas.router, prefix="/cobrancas", tags=["Cobranças"])
api_router.include_router(pagamentos.router, prefix="/pagamentos", tags=["Pagamentos"])
api_router.include_router(repasse.router, prefix="/repasses", tags=["Repasses"])
api_router.include_router(lembretes.router, prefix="/lembretes", tags=["Lembretes"])
api_router.include_router(internal.router, prefix="/internal", tags=["Internal"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

api_router.include_router(
    notificacoes.router, prefix="/notificacoes", tags=["Notificações"]
)
