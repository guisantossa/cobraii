from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# === USUÁRIO ===
class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    documento: str


class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)


class UsuarioOut(UsuarioBase):
    id: UUID

    class Config:
        from_attributes = True
