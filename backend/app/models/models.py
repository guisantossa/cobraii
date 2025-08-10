import enum
import uuid

from app.db.session import Base
from sqlalchemy import (
    TIMESTAMP,
    Column,
    Date,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


# Enums
class TipoUsuarioEnum(str, enum.Enum):
    pf = "pf"
    pj = "pj"


class CanalEnvioEnum(str, enum.Enum):
    whatsapp = "whatsapp"
    email = "email"


class StatusCobrancaEnum(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    cancelado = "cancelado"
    repassado = "repassado"


class MetodoRepasseEnum(str, enum.Enum):
    pix_manual = "pix_manual"
    pix_api = "pix_api"


class StatusRepasseEnum(str, enum.Enum):
    efetuado = "efetuado"
    falhou = "falhou"


class StatusNotificacaoEnum(str, enum.Enum):
    sucesso = "sucesso"
    falha = "falha"


# Models


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    telefone = Column(String, nullable=False)
    senha_hash = Column(String, nullable=False)
    tipo_usuario = Column(Enum(TipoUsuarioEnum), nullable=False)
    documento = Column(String, unique=True, nullable=False)
    banco = Column(String)
    conta = Column(String)
    chave_pix = Column(String)

    clientes = relationship("Cliente", back_populates="usuario", cascade="all, delete")
    cobrancas = relationship(
        "Cobranca", back_populates="usuario", cascade="all, delete"
    )


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    nome = Column(String, nullable=False)
    email = Column(String)
    telefone = Column(String)
    documento = Column(String)

    usuario = relationship("Usuario", back_populates="clientes")
    cobrancas = relationship(
        "Cobranca", back_populates="cliente", cascade="all, delete"
    )


class Cobranca(Base):
    __tablename__ = "cobrancas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    cliente_id = Column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    valor = Column(Numeric(10, 2), nullable=False)
    descricao = Column(Text)
    vencimento = Column(Date, nullable=False)
    canal_envio = Column(Enum(CanalEnvioEnum))
    status = Column(Enum(StatusCobrancaEnum), default=StatusCobrancaEnum.pendente)
    asaas_payment_id = Column(String)
    link_pagamento = Column(String)

    usuario = relationship("Usuario", back_populates="cobrancas")
    cliente = relationship("Cliente", back_populates="cobrancas")
    pagamentos = relationship(
        "Pagamento", back_populates="cobranca", cascade="all, delete"
    )
    repasse = relationship(
        "Repasse", back_populates="cobranca", uselist=False, cascade="all, delete"
    )
    notificacoes = relationship(
        "Notificacao", back_populates="cobranca", cascade="all, delete"
    )


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cobranca_id = Column(UUID(as_uuid=True), ForeignKey("cobrancas.id"))
    valor_bruto = Column(Numeric(10, 2), nullable=False)
    forma_pagamento = Column(String)
    data_pagamento = Column(TIMESTAMP)

    cobranca = relationship("Cobranca", back_populates="pagamentos")


class Repasse(Base):
    __tablename__ = "repasses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cobranca_id = Column(UUID(as_uuid=True), ForeignKey("cobrancas.id"))
    valor_bruto = Column(Numeric(10, 2), nullable=False)
    taxa = Column(Numeric(10, 2))
    valor_liquido = Column(Numeric(10, 2))
    data_repassado = Column(TIMESTAMP)
    metodo = Column(Enum(MetodoRepasseEnum))
    status = Column(Enum(StatusRepasseEnum), default=StatusRepasseEnum.efetuado)

    cobranca = relationship("Cobranca", back_populates="repasse")


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cobranca_id = Column(UUID(as_uuid=True), ForeignKey("cobrancas.id"))
    canal = Column(Enum(CanalEnvioEnum), nullable=False)
    enviado_em = Column(TIMESTAMP)
    status = Column(Enum(StatusNotificacaoEnum))
    tentativa = Column(Integer, default=1)

    cobranca = relationship("Cobranca", back_populates="notificacoes")
