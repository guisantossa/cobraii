# app/models/enums.py
import enum


class LembreteTipoEnum(str, enum.Enum):
    cobranca = "cobranca"
    documento = "documento"
    agendamento = "agendamento"
    aviso = "aviso"


class CanalEnvioEnum(str, enum.Enum):
    whatsapp = "whatsapp"
    email = "email"
    sms = "sms"
    webhook = "webhook"


class EstadoLembreteEnum(str, enum.Enum):
    rascunho = "rascunho"
    agendado = "agendado"
    pausado = "pausado"
    cancelado = "cancelado"


class StatusOcorrenciaEnum(str, enum.Enum):
    enfileirado = "enfileirado"
    em_execucao = "em_execucao"
    enviado = "enviado"
    entregue = "entregue"
    falhou = "falhou"
    skip_por_quiet_hours = "skip_por_quiet_hours"
    cancelado = "cancelado"


class GatewayPagamentoEnum(str, enum.Enum):
    asaas = "asaas"
    stripe = "stripe"
    pagarme = "pagarme"


class StatusPagamentoEnum(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    vencido = "vencido"
    cancelado = "cancelado"
    renegociado = "renegociado"
