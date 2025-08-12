import uuid
from datetime import datetime

from app.db.base import Base
from app.models.enums import RecorrenciaEnum
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


class Cobranca(Base):
    __tablename__ = "cobrancas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, index=True
    )

    titulo = Column(String(140), nullable=False)
    descricao = Column(Text, nullable=True)

    # cliente pode ser FK ou nome avulso
    cliente_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clientes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    cliente_nome_avulso = Column(String(180), nullable=True)

    valor = Column(Numeric(12, 2), nullable=False)
    recorrencia = Column(
        Enum(RecorrenciaEnum, name="recorrencia_enum"),
        nullable=False,
        default=RecorrenciaEnum.unica,
    )
    vencimento = Column(Date, nullable=False)

    data_criacao = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_atualizacao = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # rels
    usuarios = relationship(
        "Usuario", back_populates="cobrancas", lazy="joined", foreign_keys=[usuario_id]
    )
    clientes = relationship(
        "Cliente",
        back_populates="cobrancas",
        lazy="selectin",
        foreign_keys=[cliente_id],
    )
    faturas = relationship(
        "Fatura", back_populates="cobrancas", cascade="all, delete-orphan"
    )

    @property
    def cliente(self):
        return self.clientes
