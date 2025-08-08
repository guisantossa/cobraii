from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from .schemas import TipoUsuarioEnum


# === USUÁRIO ===
class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    tipo_usuario: TipoUsuarioEnum
    documento: str
    banco: Optional[str] = None
    conta: Optional[str] = None
    chave_pix: Optional[str] = None


class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)


class UsuarioOut(UsuarioBase):
    id: UUID

    class Config:
        from_attributes = True
