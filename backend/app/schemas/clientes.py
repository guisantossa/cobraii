from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# === CLIENTE ===
class ClienteBase(BaseModel):
    nome: str
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    documento: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteOut(ClienteBase):
    id: UUID
    usuario_id: UUID

    class Config:
        from_attributes = True
