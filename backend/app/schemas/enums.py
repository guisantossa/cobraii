from enum import Enum


# === ENUMS ===
class TipoUsuarioEnum(str, Enum):
    pf = "pf"
    pj = "pj"


class CanalEnvioEnum(str, Enum):
    whatsapp = "whatsapp"
    email = "email"


class StatusCobrancaEnum(str, Enum):
    pendente = "pendente"
    pago = "pago"
    cancelado = "cancelado"
    repassado = "repassado"


class MetodoRepasseEnum(str, Enum):
    pix_manual = "pix_manual"
    pix_api = "pix_api"


class StatusRepasseEnum(str, Enum):
    efetuado = "efetuado"
    falhou = "falhou"


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
