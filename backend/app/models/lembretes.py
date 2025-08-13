import uuid

from app.db.base import Base
from app.models.enums import CanalLembreteEnum  # defina se ainda não existir
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class Lembrete(Base):
    __tablename__ = "lembretes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=False)

    # para lembrete de fatura
    fatura_id = Column(UUID(as_uuid=True), ForeignKey("faturas.id"), nullable=True)

    # comum
    titulo = Column(Text, nullable=False)
    corpo = Column(Text, nullable=True)
    canal = Column(Enum(CanalLembreteEnum, name="canal_lembrete_enum"), nullable=False)

    # âncora opcional para lembretes sem fatura (ex.: aniversário/ocasião fixa)
    event_date = Column(Date, nullable=True)

    # RRULE (apenas para periódicos)
    rrule = Column(Text, nullable=True)
    dtstart = Column(DateTime(timezone=True), nullable=True)
    tz = Column(String, nullable=False, default="America/Sao_Paulo")

    # OFFSETS (apenas para fatura)
    offsets = Column(JSONB, nullable=True)  # lista de objetos {when,days,hora,condicao}

    condicao = Column(
        String, nullable=False, default="sempre"
    )  # "sempre" | "se_nao_cumprido"
    ativa = Column(Boolean, nullable=False, default=True)
    proxima_execucao_at = Column(DateTime(timezone=True), nullable=True)
    meta = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default="now()")
    updated_at = Column(
        DateTime(timezone=True), server_default="now()", onupdate="now()"
    )

    cliente = relationship("Cliente")
    fatura = relationship("Fatura")
