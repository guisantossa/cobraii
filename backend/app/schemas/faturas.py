from datetime import date, datetime
from typing import Optional
from uuid import UUID

from app.models.enums import FaturaStatusEnum
from pydantic import BaseModel, condecimal


class FaturaBase(BaseModel):
    usuario_id: UUID
    cobranca_id: UUID
    valor: condecimal(max_digits=12, decimal_places=2)
    vencimento: date
    data_pagamento: Optional[date] = None
    status: FaturaStatusEnum = FaturaStatusEnum.pendente


class FaturaCreate(FaturaBase):
    pass


class FaturaUpdate(BaseModel):
    valor: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    status: Optional[FaturaStatusEnum] = None


class FaturaOut(FaturaBase):
    id: UUID
    data_criacao: datetime
    data_atualizacao: datetime

    class Config:
        from_attributes = True
