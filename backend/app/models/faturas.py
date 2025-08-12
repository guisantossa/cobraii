import uuid
from datetime import datetime

from app.db.base import Base
from app.models.enums import FaturaStatusEnum
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Fatura(Base):
    __tablename__ = "faturas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, index=True
    )
    cobranca_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cobrancas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    valor = Column(Numeric(12, 2), nullable=False)
    vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    status = Column(
        Enum(FaturaStatusEnum, name="fatura_status_enum"),
        nullable=False,
        default=FaturaStatusEnum.pendente,
    )

    data_criacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_atualizacao = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # rels
    cobrancas = relationship("Cobranca", back_populates="faturas")
    usuarios = relationship(
        "Usuario", back_populates="faturas", lazy="joined", foreign_keys=[usuario_id]
    )
