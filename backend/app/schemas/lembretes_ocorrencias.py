# app/schemas/lembretes_ocorrencias.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from app.models.enums import StatusOcorrenciaEnum  # ajuste se o import for outro
from pydantic import BaseModel, Field, field_validator


class LembreteOcorrenciaBase(BaseModel):
    """Campos comuns de uma ocorrência do lembrete (somente leitura na maior parte)."""

    lembrete_id: UUID
    scheduled_at: datetime
    status: StatusOcorrenciaEnum
    motivo_skip: Optional[str] = None
    tentativas: int = 0
    enviado_at: Optional[datetime] = Field(
        default=None, serialization_alias="enviado_em"
    )
    canal_message_id: Optional[str] = None
    retorno_gateway: Optional[Dict[str, Any]] = None
    payload_enviado: Optional[Dict[str, Any]] = None

    # No model a coluna tentativas é String — coerção para int
    @field_validator("tentativas", mode="before")
    @classmethod
    def _coerce_tentativas(cls, v):
        try:
            return int(v) if v is not None else 0
        except Exception:
            return 0

    model_config = {
        "from_attributes": True,  # Pydantic v2
        "populate_by_name": True,
    }


class LembreteOcorrenciaOut(LembreteOcorrenciaBase):
    """Resposta para listagem/detalhe das ocorrências."""

    id: UUID
    created_at: Optional[datetime] = None
