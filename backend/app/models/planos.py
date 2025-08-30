# app/models/planos.py
from app.db.base import Base  # ajuste se o seu Base for diferente
from sqlalchemy import Boolean, Column, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship


class Plano(Base):
    __tablename__ = "planos"

    id = Column(PGUUID(as_uuid=True), primary_key=True, nullable=False)
    nome = Column(String(100), nullable=False, unique=True)
    usa_email = Column(Boolean, nullable=False, default=False)
    usa_sms = Column(Boolean, nullable=False, default=False)
    usa_zap = Column(Boolean, nullable=False, default=False)
    valor_mensal = Column(Numeric(10, 2), nullable=False, default=0)
    valor_anual = Column(Numeric(10, 2), nullable=False, default=0)
    limites = Column(Integer, nullable=True)  # NULL = ilimitado

    usuarios = relationship("Usuario", back_populates="plano")
