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
