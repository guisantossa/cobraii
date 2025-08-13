import uuid
from datetime import datetime

from app.db.base import Base
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), index=True, nullable=True
    )

    entidade_tipo = Column(
        String(40), nullable=False
    )  # cliente|fatura|lembrete|template|...
    entidade_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    acao = Column(
        String(40), nullable=False
    )  # create|update|delete|send|schedule|status_update|payment_received
    detalhes = Column(JSONB, nullable=True)  # diffs/payloads/antes->depois
    ip = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)

    criado_em = Column(DateTime, nullable=False, default=datetime.utcnow)

    usuario = relationship("Usuario")
