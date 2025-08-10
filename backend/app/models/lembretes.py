# app/models/lembretes.py
import uuid
from datetime import datetime

from app.db.session import Base  # seu Base declarativo
from app.models.enums import (
    CanalEnvioEnum,
    EstadoLembreteEnum,
    GatewayPagamentoEnum,
    LembreteTipoEnum,
    StatusOcorrenciaEnum,
    StatusPagamentoEnum,
)
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


# ------- Núcleo -------
class Lembrete(Base):
    __tablename__ = "lembretes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)

    tipo = Column(Enum(LembreteTipoEnum, name="lembrete_tipo"), nullable=False)
    titulo = Column(String(120))
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True)

    # conteúdo
    conteudo = Column(JSON, nullable=False, default=dict)  # {"mensagem": "..."}
    payload = Column(JSON, nullable=False, default=dict)  # dados para placeholders

    # agendamento
    timezone = Column(String(64), nullable=False, default="America/Sao_Paulo")
    dt_inicio = Column(DateTime(timezone=True), nullable=False)
    dt_fim = Column(DateTime(timezone=True), nullable=True)
    rrule = Column(Text, nullable=True)
    recorrente = Column(Boolean, default=False)

    # quiet hours (opcional)
    quiet_hours_start = Column(Time, nullable=True)
    quiet_hours_end = Column(Time, nullable=True)

    estado = Column(
        Enum(EstadoLembreteEnum, name="estado_lembrete"),
        nullable=False,
        default=EstadoLembreteEnum.agendado,
    )

    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # relations
    canais = relationship(
        "LembreteCanal", back_populates="lembrete", cascade="all, delete-orphan"
    )
    destinatarios = relationship(
        "LembreteDestinatario", back_populates="lembrete", cascade="all, delete-orphan"
    )
    ocorrencias = relationship(
        "LembreteOcorrencia", back_populates="lembrete", cascade="all, delete-orphan"
    )

    # subtipos
    cobranca = relationship(
        "LembreteCobranca",
        back_populates="lembrete",
        uselist=False,
        cascade="all, delete-orphan",
    )
    documento = relationship(
        "LembreteDocumento",
        back_populates="lembrete",
        uselist=False,
        cascade="all, delete-orphan",
    )
    agendamento = relationship(
        "LembreteAgendamento",
        back_populates="lembrete",
        uselist=False,
        cascade="all, delete-orphan",
    )
    aviso = relationship(
        "LembreteAviso",
        back_populates="lembrete",
        uselist=False,
        cascade="all, delete-orphan",
    )

    template = relationship("Template", back_populates="lembretes")


Index("ix_lembretes_usuario_estado", Lembrete.usuario_id, Lembrete.estado)
Index("ix_lembretes_dt_inicio", Lembrete.dt_inicio)


class LembreteCanal(Base):
    __tablename__ = "lembrete_canais"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        nullable=False,
    )

    canal = Column(Enum(CanalEnvioEnum, name="canal_envio"), nullable=False)
    ordem = Column(Integer, nullable=False, default=1)
    habilitado = Column(Boolean, default=True)
    config = Column(
        JSON, default=dict
    )  # ex: {"assunto": "...", "remetente_label": "..."}

    lembrete = relationship("Lembrete", back_populates="canais")

    __table_args__ = (
        UniqueConstraint("lembrete_id", "ordem", name="uq_lembrete_canal_ordem"),
        Index("ix_lembrete_canais_lembrete", "lembrete_id"),
    )


class LembreteDestinatario(Base):
    __tablename__ = "lembrete_destinatarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        nullable=False,
    )

    # referencia a cliente OU contato avulso
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"), nullable=True)
    nome = Column(String(120), nullable=True)
    telefone = Column(String(32), nullable=True)
    email = Column(String(254), nullable=True)

    canal_bloqueado_flags = Column(
        JSON, default=dict
    )  # {"whatsapp": true, "email": false, ...}
    status_validacao = Column(String(32), default="ok")

    lembrete = relationship("Lembrete", back_populates="destinatarios")

    __table_args__ = (
        Index("ix_lembrete_destinatarios_lembrete", "lembrete_id"),
        Index("ix_lembrete_destinatarios_cliente", "cliente_id"),
    )


class LembreteOcorrencia(Base):
    __tablename__ = "lembrete_ocorrencias"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        nullable=False,
    )
    destinatario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembrete_destinatarios.id", ondelete="CASCADE"),
        nullable=False,
    )

    dt_programada = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(StatusOcorrenciaEnum, name="status_ocorrencia"),
        nullable=False,
        default=StatusOcorrenciaEnum.enfileirado,
    )
    tentativas = Column(Integer, default=0)
    ultimo_erro = Column(String(256), nullable=True)
    canal_usado = Column(Enum(CanalEnvioEnum, name="canal_envio"), nullable=True)

    dt_envio = Column(DateTime(timezone=True), nullable=True)
    dt_entrega = Column(DateTime(timezone=True), nullable=True)

    lembrete = relationship("Lembrete", back_populates="ocorrencias")
    destinatario = relationship("LembreteDestinatario")

    __table_args__ = (
        Index("ix_ocorrencias_programada", "dt_programada"),
        Index("ix_ocorrencias_status", "status"),
        Index("ix_ocorrencias_lembrete", "lembrete_id"),
    )


class LembreteOcorrenciaCanalLog(Base):
    __tablename__ = "lembrete_ocorrencia_canal_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ocorrencia_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembrete_ocorrencias.id", ondelete="CASCADE"),
        nullable=False,
    )

    canal = Column(Enum(CanalEnvioEnum, name="canal_envio"), nullable=False)
    tentativa = Column(Integer, default=1)
    codigo = Column(String(64), nullable=True)  # ex: WHATS_PROVIDER_DOWN
    mensagem = Column(Text, nullable=True)
    protocolo_externo = Column(String(128), nullable=True)
    payload_resumido = Column(JSON, default=dict)
    dt_evento = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (Index("ix_log_ocorrencia", "ocorrencia_id"),)


# ------- Subtipos -------
class LembreteCobranca(Base):
    __tablename__ = "lembrete_cobranca"

    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    valor = Column(Numeric(10, 2), nullable=False)
    vencimento = Column(Date, nullable=False)
    link_pagamento = Column(String, nullable=True)

    gateway = Column(
        Enum(GatewayPagamentoEnum, name="gateway_pagamento"), nullable=True
    )
    payment_external_id = Column(String, nullable=True)
    status_pagamento = Column(
        Enum(StatusPagamentoEnum, name="status_pagamento"),
        default=StatusPagamentoEnum.pendente,
        nullable=False,
    )

    metadados = Column(JSON, default=dict)

    lembrete = relationship("Lembrete", back_populates="cobranca")


class LembreteDocumento(Base):
    __tablename__ = "lembrete_documento"

    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    lista_documentos = Column(JSON, nullable=False, default=list)  # ["RG", "CPF", ...]
    deadline = Column(Date, nullable=True)
    instrucao_upload = Column(String, nullable=True)

    lembrete = relationship("Lembrete", back_populates="documento")


class LembreteAgendamento(Base):
    __tablename__ = "lembrete_agendamento"

    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    data_hora = Column(DateTime(timezone=True), nullable=True)
    local = Column(String(140), nullable=True)
    link_meeting = Column(String, nullable=True)

    lembrete = relationship("Lembrete", back_populates="agendamento")


class LembreteAviso(Base):
    __tablename__ = "lembrete_aviso"

    lembrete_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lembretes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    nota = Column(Text, nullable=True)

    lembrete = relationship("Lembrete", back_populates="aviso")


# ------- Auxiliares -------
class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    nome = Column(String(80), nullable=False)
    canal = Column(Enum(CanalEnvioEnum, name="canal_envio"), nullable=False)
    conteudo = Column(Text, nullable=False)  # texto com {{placeholders}}

    created_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    lembretes = relationship("Lembrete", back_populates="template")


class GatewayConfig(Base):
    __tablename__ = "gateway_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    gateway = Column(
        Enum(GatewayPagamentoEnum, name="gateway_pagamento"), nullable=False
    )
    label = Column(String(80), nullable=True)
    api_key = Column(String, nullable=False)
    config = Column(JSON, default=dict)
    ativo = Column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("usuario_id", "gateway", name="uq_usuario_gateway"),
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fonte = Column(String(40), nullable=False)  # "asaas", "stripe", etc.
    evento = Column(String(120), nullable=True)
    payload_json = Column(JSON, nullable=False)
    dt_recebido = Column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    processado = Column(Boolean, default=False)
    error_code = Column(String(64), nullable=True)


class ClientePreferencias(Base):
    __tablename__ = "cliente_preferencias"

    cliente_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clientes.id", ondelete="CASCADE"),
        primary_key=True,
    )
    optout_whatsapp = Column(Boolean, default=False)
    optout_email = Column(Boolean, default=False)
    optout_sms = Column(Boolean, default=False)
    horario_preferido_inicio = Column(Time, nullable=True)
    horario_preferido_fim = Column(Time, nullable=True)
    idioma = Column(String(10), nullable=True)
