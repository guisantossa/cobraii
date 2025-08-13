# app/models/templates.py
import uuid
from datetime import datetime

from app.db.base import Base
from app.models.enums import CanalLembreteEnum  # ("whatsapp", "email", "sms", "todos")
from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class TemplateMensagem(Base):
    __tablename__ = "templates_mensagem"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, index=True
    )

    titulo = Column(String(120), nullable=False)
    corpo = Column(Text, nullable=False)

    # Lista de placeholders detectados no corpo, ex.: ["Cliente", "Vencimento"]
    placeholders = Column(JSONB, nullable=True)

    # Opcional: para filtrar templates por canal
    canal = Column(Enum(CanalLembreteEnum, name="canal_lembrete_enum"), nullable=True)

    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # relacionamento (se quiser navegar para Usuario)
    usuario = relationship("Usuario", backref="templates_mensagem")
