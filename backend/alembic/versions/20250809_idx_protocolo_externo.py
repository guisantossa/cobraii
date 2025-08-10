# alembic/versions/20250809_idx_protocolo_externo.py
from alembic import op

revision = "20250809_idx_protocolo_externo"
down_revision = "20250809_add_em_execucao_enum"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_log_protocolo_externo",
        "lembrete_ocorrencia_canal_log",
        ["protocolo_externo"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_log_protocolo_externo", table_name="lembrete_ocorrencia_canal_log"
    )
