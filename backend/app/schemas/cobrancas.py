from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from .schemas import CanalEnvioEnum, StatusCobrancaEnum


# === COBRANÇA ===
class CobrancaBase(BaseModel):
    valor: float
    descricao: Optional[str] = None
    vencimento: date
    canal_envio: Optional[CanalEnvioEnum] = None


class CobrancaCreate(CobrancaBase):
    cliente_id: UUID


class CobrancaOut(CobrancaBase):
    id: UUID
    status: StatusCobrancaEnum
    link_pagamento: Optional[str]
    asaas_payment_id: Optional[str]
    cliente_id: UUID
    usuario_id: UUID

    class Config:
        from_attributes = True
