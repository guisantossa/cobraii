import sqlalchemy as sa
from alembic import op

revision = "20250809_add_em_execucao_enum"
down_revision = "b61771ffb247"
branch_labels = None
depends_on = None

old = sa.Enum(
    "enfileirado",
    "enviado",
    "entregue",
    "falhou",
    "skip_por_quiet_hours",
    "cancelado",
    name="status_ocorrencia",
)
new = sa.Enum(
    "enfileirado",
    "em_execucao",
    "enviado",
    "entregue",
    "falhou",
    "skip_por_quiet_hours",
    "cancelado",
    name="status_ocorrencia",
)


def upgrade():
    # 1) renomeia tipo antigo
    op.execute("ALTER TYPE status_ocorrencia RENAME TO status_ocorrencia_old;")
    # 2) cria novo tipo
    new.create(op.get_bind(), checkfirst=False)
    # 3) altera a coluna para usar o novo tipo (CAST por texto)
    op.execute(
        """
        ALTER TABLE lembrete_ocorrencias
        ALTER COLUMN status TYPE status_ocorrencia USING status::text::status_ocorrencia;
    """
    )
    # 4) remove o antigo
    op.execute("DROP TYPE status_ocorrencia_old;")


def downgrade():
    # rollback: recria o tipo sem 'em_execucao'
    op.execute(
        "CREATE TYPE status_ocorrencia_old AS ENUM  \
            ('enfileirado','enviado','entregue','falhou','skip_por_quiet_hours','cancelado');"
    )
    op.execute(
        """
        ALTER TABLE lembrete_ocorrencias
        ALTER COLUMN status TYPE status_ocorrencia_old USING status::text::status_ocorrencia_old;
    """
    )
    op.execute("DROP TYPE status_ocorrencia;")
    op.execute("ALTER TYPE status_ocorrencia_old RENAME TO status_ocorrencia;")
