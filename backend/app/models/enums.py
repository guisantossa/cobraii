# app/models/enums.py
from enum import Enum


class RecorrenciaEnum(str, Enum):
    unica = "unica"
    semanal = "semanal"
    mensal = "mensal"
    anual = "anual"


class FaturaStatusEnum(str, Enum):
    pendente = "pendente"
    pago = "pago"
    atrasado = "atrasado"
    cancelado = "cancelado"


class StatusNotificacaoEnum(str, Enum):
    sucesso = "sucesso"
    falha = "falha"


class CanalLembreteEnum(str, Enum):
    whatsapp = "whatsapp"
    email = "email"
    sms = "sms"


class StatusOcorrenciaEnum(str, Enum):
    pendente = "pendente"
    enviado = "enviado"
    erro = "erro"
    cancelado = "cancelado"
    skipped = "skipped"
