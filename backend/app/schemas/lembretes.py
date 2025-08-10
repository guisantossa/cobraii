# app/schemas/lembretes.py
from __future__ import annotations

from datetime import date, datetime, time
from typing import Any, Dict, List, Literal, Optional

from pydantic import AnyUrl, BaseModel, EmailStr, Field, validator

LembreteTipo = Literal["cobranca", "documento", "agendamento", "aviso"]
CanalEnvio = Literal["whatsapp", "email", "sms", "webhook"]


# ---------- Subtipos ----------
class SubtipoCobrancaIn(BaseModel):
    valor: float = Field(..., gt=0)
    vencimento: date
    link_pagamento: Optional[AnyUrl] = None
    gateway: Optional[Literal["asaas", "stripe", "pagarme"]] = None
    parcelas: Optional[int] = Field(None, ge=1, le=48)
    metadados: Optional[Dict[str, Any]] = None


class SubtipoDocumentoIn(BaseModel):
    lista_documentos: List[str] = Field(..., min_items=1, max_items=50)
    deadline: Optional[date] = None
    instrucao_upload: Optional[AnyUrl] = None


class SubtipoAgendamentoIn(BaseModel):
    data_hora: Optional[datetime] = None
    local: Optional[str] = Field(None, max_length=140)
    link_meeting: Optional[AnyUrl] = None


class SubtipoAvisoIn(BaseModel):
    nota: Optional[str] = None


class SubtipoIn(BaseModel):
    cobranca: Optional[SubtipoCobrancaIn] = None
    documento: Optional[SubtipoDocumentoIn] = None
    agendamento: Optional[SubtipoAgendamentoIn] = None
    aviso: Optional[SubtipoAvisoIn] = None


# ---------- Canais & Destinatários ----------
class LembreteCanalIn(BaseModel):
    canal: CanalEnvio
    ordem: int = 1
    habilitado: bool = True
    config: Optional[Dict[str, Any]] = None


class LembreteDestinatarioAvulsoIn(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None


class LembreteDestinatarioIn(BaseModel):
    cliente_id: Optional[str] = None
    contato_avulso: Optional[LembreteDestinatarioAvulsoIn] = None

    @validator("contato_avulso", always=True)
    def check_dest(cls, v, values):
        if not v and not values.get("cliente_id"):
            raise ValueError("Informe cliente_id ou contato_avulso")
        return v


# ---------- Agendamento ----------
class AgendamentoIn(BaseModel):
    timezone: Optional[str] = "America/Sao_Paulo"
    dt_inicio: datetime
    dt_fim: Optional[datetime] = None
    rrule: Optional[str] = None
    recorrente: bool = False
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None


# ---------- Create ----------
class LembreteCreate(BaseModel):
    tipo: LembreteTipo
    titulo: Optional[str] = Field(None, max_length=120)

    template_id: Optional[str] = None
    conteudo: Dict[str, Any] = Field(
        ..., description="Ex.: {'mensagem': 'Olá {{cliente.primeiro_nome}}'}"
    )
    payload: Dict[str, Any] = Field(default_factory=dict)

    agendamento: AgendamentoIn
    canais: List[LembreteCanalIn]
    destinatarios: List[LembreteDestinatarioIn]
    subtipo: Optional[SubtipoIn] = None


# ---------- Read (resumos) ----------
class LembreteResumoOut(BaseModel):
    id: str
    tipo: LembreteTipo
    titulo: Optional[str]
    estado: Literal["rascunho", "agendado", "pausado", "cancelado"]
    proxima_execucao: Optional[datetime] = None


class PageOut(BaseModel):
    items: List[LembreteResumoOut]
    page: int
    total: int


# ---------- Detalhe ----------
class LembreteCanalOut(BaseModel):
    id: str
    canal: CanalEnvio
    ordem: int
    habilitado: bool
    config: Dict[str, Any] | None = None


class LembreteDestinatarioOut(BaseModel):
    id: str
    cliente_id: Optional[str]
    contato_avulso: Optional[Dict[str, Any]] = None


class SubtipoCobrancaOut(BaseModel):
    valor: float
    vencimento: date
    link_pagamento: Optional[str]
    gateway: Optional[str]
    status_pagamento: Literal[
        "pendente", "pago", "vencido", "cancelado", "renegociado"
    ] = "pendente"
    payment_external_id: Optional[str] = None
    metadados: Optional[Dict[str, Any]] = None


class LembreteDetalheOut(BaseModel):
    id: str
    tipo: LembreteTipo
    titulo: Optional[str]
    estado: Literal["rascunho", "agendado", "pausado", "cancelado"]
    template_id: Optional[str]
    conteudo: Dict[str, Any]
    payload: Dict[str, Any]
    agendamento: AgendamentoIn
    canais: List[LembreteCanalOut]
    destinatarios: List[LembreteDestinatarioOut]
    subtipo: Optional[Dict[str, Any]] = None


# ---------- Utilidades ----------
class PreviewIn(BaseModel):
    canal: CanalEnvio
    conteudo: Dict[str, Any]
    payload: Dict[str, Any] = Field(default_factory=dict)
    exemplo_cliente_id: Optional[str] = None


class PreviewOut(BaseModel):
    render: str


class SimularRecorrenciaIn(BaseModel):
    timezone: Optional[str] = "America/Sao_Paulo"
    dt_inicio: datetime
    dt_fim: Optional[datetime] = None
    rrule: str
    limite: int = Field(10, ge=1, le=100)


class SimularRecorrenciaOut(BaseModel):
    instantes: List[datetime]


# --- UPDATE parcial ---
class LembreteUpdate(BaseModel):
    tipo: Optional[LembreteTipo] = None
    titulo: Optional[str] = Field(None, max_length=120)
    template_id: Optional[str] = None
    conteudo: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None
    agendamento: Optional[AgendamentoIn] = None
    canais: Optional[List[LembreteCanalIn]] = None
    destinatarios: Optional[List[LembreteDestinatarioIn]] = None
    subtipo: Optional[SubtipoIn] = None


# --- PATCH estado ---
class EstadoPatchIn(BaseModel):
    acao: Literal["pausar", "retomar", "cancelar"]


class EstadoPatchOut(BaseModel):
    id: str
    estado: Literal["rascunho", "agendado", "pausado", "cancelado"]


# --- Ocorrências (GET) ---
class OcorrenciaOut(BaseModel):
    id: str
    destinatario: Dict[str, Any]
    dt_programada: datetime
    status: Literal[
        "enfileirado",
        "enviado",
        "entregue",
        "falhou",
        "skip_por_quiet_hours",
        "cancelado",
    ]
    canal_usado: Optional[CanalEnvio] = None
    tentativas: int
    ultimo_erro: Optional[str] = None


class PageOcorrenciasOut(BaseModel):
    items: List[OcorrenciaOut]
    page: int
    total: int
