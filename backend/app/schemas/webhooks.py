# app/schemas/webhooks.py
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel


# Evolution (Whats)
class EvolutionMessageIn(BaseModel):
    event: Optional[str] = None  # ex: "message_ack"
    status: Optional[str] = None  # ex: "sent" | "delivered" | "read" | "failed"
    messageId: Optional[str] = None  # protocolo_externo
    to: Optional[str] = None
    from_: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


# Email (SES/SNTP genérico)
class EmailWebhookIn(BaseModel):
    provider: Optional[str] = None  # "ses" | "smtp" | "sendgrid" ...
    message_id: Optional[str] = None
    status: Optional[str] = (
        None  # "delivered" | "bounced" | "complaint" | "deferred" | "failed"
    )
    to: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


# SMS (genérico)
class SmsWebhookIn(BaseModel):
    provider: Optional[str] = None  # "twilio" | "zenvia" | "totalvoice" ...
    message_id: Optional[str] = None
    status: Optional[str] = None  # "sent" | "delivered" | "undelivered" | "failed"
    to: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
