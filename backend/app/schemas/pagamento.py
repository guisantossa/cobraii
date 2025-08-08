from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# === PAGAMENTO ===
class PagamentoBase(BaseModel):
    valor_bruto: float
    forma_pagamento: Optional[str]
    data_pagamento: datetime


class PagamentoCreate(PagamentoBase):
    cobranca_id: UUID


class PagamentoOut(PagamentoBase):
    id: UUID
    cobranca_id: UUID

    class Config:
        from_attributes = True
