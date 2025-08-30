# app/schemas/planos.py
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class PlanoBase(BaseModel):
    nome: str
    usa_email: bool
    usa_sms: bool
    usa_zap: bool
    valor_mensal: Decimal
    valor_anual: Decimal
    limites: Optional[int] = None  # None = ilimitado


class PlanoOut(PlanoBase):
    id: UUID

    class Config:
        from_attributes = True
