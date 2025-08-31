# app/models/feedback.py
import uuid
from datetime import datetime
from enum import Enum as PyEnum

from app.db.base import Base
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class FeedbackTipo(PyEnum):
    bug = "bug"
    sugestao = "sugestao"
    elogio = "elogio"
    nps = "nps"
    upgrade_reason = "upgrade_reason"
    usabilidade = "usabilidade"


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True, index=True
    )
    origem = Column(
        String(80), nullable=True
    )  # ex: "onboarding", "lembretes_form", "upgrade_cta"
    tipo = Column(Enum(FeedbackTipo, name="feedback_tipo_enum"), nullable=False)
    rating = Column(Integer, nullable=True)  # 1..5 (ou 0..10 p/ NPS)
    comentario = Column(Text, nullable=True)
    contexto = Column(JSONB, nullable=True)  # page, ua, plano, etc
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    usuario = relationship("Usuario", backref="feedbacks")
