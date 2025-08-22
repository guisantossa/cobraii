# versions/20250820_add_index_lembretes_next_exec.py
from alembic import op

revision = "250820_a9s7d_add_index"
down_revision = "250813_a8e5_create_audit_log"


def upgrade() -> None:
    op.execute(
        """
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_lembretes_next_exec
    ON lembretes (proxima_execucao_at)
    WHERE ativa = true;
    """
    )


def downgrade() -> None:
    op.execute(
        """
    DROP INDEX IF EXISTS ix_lembretes_next_exec;
    """
    )
