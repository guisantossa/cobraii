# versions/20250820_add_index_lembretes_next_exec.py
import sqlalchemy as sa
from alembic import op

revision = "250820_a9s7d_add_index"
down_revision = "250813_a8e5_create_audit_log"


def upgrade():
    # CREATE INDEX CONCURRENTLY exige fora de transação
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_lembretes_next_exec",
            "lembretes",
            ["proxima_execucao_at"],
            postgresql_where=sa.text("ativa = true"),
            postgresql_concurrently=True,
        )


def downgrade():
    # DROP INDEX CONCURRENTLY também exige fora de transação
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_lembretes_next_exec",
            table_name="lembretes",
            postgresql_concurrently=True,
        )
