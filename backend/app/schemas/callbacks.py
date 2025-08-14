# app/schemas/callbacks.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, field_validator


class CallbackOcorrenciaIn(BaseModel):
    # status do envio no provedor: ex.: "success", "failed", "sent", "delivered", "error"
    status: Optional[str] = None
    # data/hora do envio/entrega confirmada pelo provedor
    sent_at: Optional[datetime] = None
    # id da mensagem no gateway (ex.: id do WhatsApp, Message-Id do e-mail)
    message_id: Optional[str] = None
    # mensagem de erro/diagnóstico, se houver
    error_message: Optional[str] = None
    # payload bruto que veio do provedor (opcional)
    raw: Optional[Dict[str, Any]] = None

    @field_validator("status", mode="before")
    @classmethod
    def _norm_status(cls, v):
        return (v or "").strip().lower() or None
