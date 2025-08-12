import uuid

from app.db.base import Base
from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

# Models


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    telefone = Column(String, nullable=False)
    senha_hash = Column(String, nullable=False)
    documento = Column(String, unique=True, nullable=False)

    clientes = relationship("Cliente", back_populates="usuarios", cascade="all, delete")
    cobrancas = relationship(
        "Cobranca", back_populates="usuarios", cascade="all, delete-orphan"
    )
    faturas = relationship(
        "Fatura", back_populates="usuarios", cascade="all, delete-orphan"
    )


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), index=True, nullable=False
    )
    nome = Column(String, nullable=False)
    email = Column(String)
    telefone = Column(String)
    documento = Column(String)

    usuarios = relationship("Usuario", back_populates="clientes")
    cobrancas = relationship(
        "Cobranca", back_populates="clientes", cascade="all, delete-orphan"
    )
