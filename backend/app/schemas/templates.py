# app/schema/templates.py
from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

Canal = Literal["whatsapp", "email", "sms", "todos"]

# ---------- Base ----------


class TemplateBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=120)
    corpo: str = Field(
        ..., description="Texto do template; suporta placeholders como {{Cliente}}"
    )
    canal: Optional[Canal] = Field(
        default=None,
        description="Filtra/usabilidade por canal (opcional: whatsapp, email, sms, todos)",
    )

    # Opcional: aceitar placeholders já calculados pelo backend (CRUD)
    placeholders: Optional[List[str]] = Field(
        default=None,
        description="Lista de placeholders detectados no corpo, ex.: ['Cliente', 'Vencimento']",
    )

    @field_validator("titulo")
    @classmethod
    def _strip_titulo(cls, v: str) -> str:
        return v.strip()


# ---------- Create / Update ----------


class TemplateCreate(TemplateBase):
    """Entrada para criação."""

    pass


class TemplateUpdate(BaseModel):
    """Entrada para atualização parcial."""

    titulo: Optional[str] = Field(default=None, max_length=120)
    corpo: Optional[str] = None
    canal: Optional[Canal] = None
    placeholders: Optional[List[str]] = None

    @field_validator("titulo")
    @classmethod
    def _strip_titulo(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v


# ---------- Out ----------


class TemplateOut(TemplateBase):
    id: UUID
    usuario_id: UUID
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None

    class Config:
        from_attributes = True  # Pydantic v2: permite ORM -> schema


# ---------- Listagem com paginação ----------


class TemplateListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TemplateOut]
