# app/schemas/feedbacks.py
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from app.models.feedbacks import FeedbackTipo
from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    tipo: FeedbackTipo
    comentario: Optional[str] = None
    rating: Optional[int] = Field(None, ge=0, le=10)  # aceita 1..5 ou 0..10
    origem: Optional[str] = None
    contexto: Optional[Dict[str, Any]] = None


class FeedbackOut(BaseModel):
    id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True
