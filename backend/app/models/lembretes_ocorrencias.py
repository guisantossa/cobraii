import uuid

from app.db.base import Base
from app.models.enums import StatusOcorrenciaEnum  # defina se ainda não existir
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class LembreteOcorrencia(Base):
    __tablename__ = "lembrete_ocorrencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lembrete_id = Column(UUID(as_uuid=True), ForeignKey("lembretes.id"), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(StatusOcorrenciaEnum, name="status_ocorrencia_enum"),
        nullable=False,
        default="pendente",
    )
    motivo_skip = Column(Text, nullable=True)
    tentativas = Column(Integer, nullable=False, default=0)
    enviado_at = Column(DateTime(timezone=True), nullable=True)
    canal_message_id = Column(Text, nullable=True)
    retorno_gateway = Column(JSONB, nullable=True)
    payload_enviado = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default="now()")
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    provider_status = Column(Text, nullable=True)

    lembrete = relationship("Lembrete")
