from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from .schemas import MetodoRepasseEnum, StatusRepasseEnum


# === REPASSE ===
class RepasseBase(BaseModel):
    valor_bruto: float
    taxa: Optional[float]
    valor_liquido: Optional[float]
    data_repassado: Optional[datetime]
    metodo: Optional[MetodoRepasseEnum]
    status: StatusRepasseEnum = StatusRepasseEnum.efetuado


class RepasseCreate(RepasseBase):
    cobranca_id: UUID


class RepasseOut(RepasseBase):
    id: UUID
    cobranca_id: UUID

    class Config:
        from_attributes = True
