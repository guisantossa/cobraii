# alembic/env.py
# flake8: noqa
import os
import sys
from logging.config import fileConfig

from alembic import context
from app.db.base import Base
from sqlalchemy import engine_from_config, pool

# --- Ajuste de PYTHONPATH (garante import "app.*" quando rodar alembic a partir da raiz) ---
# Se sua estrutura for: backend/ (raiz), dentro dele alembic/ e app/
# então subimos 0 ou 1 nível conforme necessário. Ajuste se precisar.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


# IMPORTANTE: importe TODOS os models aqui para o autogenerate enxergar
from app.models import enums  # garante criação dos tipos enum
from app.models import cobrancas, faturas
from app.models.models import Cliente, Usuario

# --- Imports do seu projeto ---
from dotenv import load_dotenv

# --- Config Alembic ---
config = context.config
load_dotenv()

# Usa DATABASE_URL do .env
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Logging do Alembic
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata alvo (todos os models importados acima entram aqui)
target_metadata = Base.metadata


# --- Filtro: evita que o autogenerate tente DROPar tabelas "refletidas" não presentes no metadata ---
def include_object(object, name, type_, reflected, compare_to):
    # Se a tabela existe no banco (reflected=True) mas não existe no metadata (compare_to=None),
    # NÃO incluir em operações (evita DROP indesejado de tabelas legadas como 'usuarios', 'clientes', etc.)
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


def run_migrations_offline():
    """Executa migrations em modo offline."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Executa migrations em modo online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
