from datetime import date, datetime
from typing import Optional
from uuid import UUID

from app.models.enums import RecorrenciaEnum
from pydantic import BaseModel, Field, condecimal, validator


# ---------- Submodelo mínimo de Cliente ----------
class ClienteMini(BaseModel):
    id: UUID
    nome: str

    class Config:
        from_attributes = True


class CobrancaBase(BaseModel):
    titulo: str = Field(..., max_length=140)
    descricao: Optional[str] = None

    cliente_id: Optional[UUID] = None
    cliente_nome_avulso: Optional[str] = Field(None, max_length=180)

    valor: condecimal(max_digits=12, decimal_places=2)
    recorrencia: RecorrenciaEnum
    vencimento: date

    @validator("cliente_nome_avulso", always=True)
    def valida_cliente(cls, v, values):
        if not values.get("cliente_id") and not v:
            raise ValueError("Informe 'cliente_id' ou 'cliente_nome_avulso'.")
        return v


class CobrancaCreate(CobrancaBase):
    pass


class CobrancaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=140)
    descricao: Optional[str] = None
    cliente_id: Optional[UUID] = None
    cliente_nome_avulso: Optional[str] = Field(None, max_length=180)
    valor: Optional[condecimal(max_digits=12, decimal_places=2)] = None
    recorrencia: Optional[RecorrenciaEnum] = None
    vencimento: Optional[date] = None

    @validator("cliente_id", "cliente_nome_avulso", always=True)
    def valida_update_cliente(cls, v, values):
        # garante que pelo menos um permanece após update
        if (
            values.get("cliente_id") is None
            and values.get("cliente_nome_avulso") is None
        ):
            # sem ambos no payload, tudo bem; validação final ocorrerá no service se virar nulo
            return v
        return v


class CobrancaOut(CobrancaBase):
    id: UUID
    usuario_id: UUID
    data_criacao: datetime
    data_atualizacao: datetime
    cliente: Optional[ClienteMini] = None

    class Config:
        from_attributes = True
