from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from .schemas import CanalEnvioEnum, StatusNotificacaoEnum


# === NOTIFICAÇÃO ===
class NotificacaoBase(BaseModel):
    canal: CanalEnvioEnum
    enviado_em: Optional[datetime]
    status: Optional[StatusNotificacaoEnum]
    tentativa: int = 1


class NotificacaoCreate(NotificacaoBase):
    cobranca_id: UUID


class NotificacaoOut(NotificacaoBase):
    id: UUID
    cobranca_id: UUID

    class Config:
        from_attributes = True
