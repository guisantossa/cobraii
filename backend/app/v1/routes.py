from app.v1.endpoints import clientes, cobrancas, faturas, usuarios
from fastapi import APIRouter

api_router = APIRouter()
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(clientes.router, prefix="/clientes", tags=["Clientes"])
api_router.include_router(cobrancas.router, prefix="/cobrancas", tags=["Cobranças"])
api_router.include_router(faturas.router, prefix="/faturas", tags=["Faturas"])
