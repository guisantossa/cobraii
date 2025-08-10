# app/schemas/internal.py
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

CanalEnvio = Literal["whatsapp", "email", "sms", "webhook"]


class DestinatarioOut(BaseModel):
    id: str
    cliente_id: Optional[str] = None
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None


class SubtipoCobrancaClaim(BaseModel):
    valor: float
    vencimento: str
    link_pagamento: Optional[str] = None
    gateway: Optional[str] = None
    payment_external_id: Optional[str] = None


class ClaimItem(BaseModel):
    ocorrencia_id: str
    lembrete_id: str
    tipo: Literal["cobranca", "documento", "agendamento", "aviso"]
    channels_order: List[CanalEnvio]
    destinatario: DestinatarioOut
    rendered_message: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    agendamento: Dict[str, Any]
    subtipo: Optional[Dict[str, SubtipoCobrancaClaim]] = None


class ClaimOut(BaseModel):
    items: List[ClaimItem]


class ResultIn(BaseModel):
    final: bool = False
    status: Literal["entregue", "falhou"]
    canal_usado: CanalEnvio
    tentativa: int = 1
    codigo: Optional[str] = None
    mensagem: Optional[str] = None
    protocolo_externo: Optional[str] = None
