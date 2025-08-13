# alembic/versions/20250813_create_audit_logs.py
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "250813_a8e5_create_audit_log"
down_revision = "20250813_a7s8_lembocoralterdeliv"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "audit_logs",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id"),
            nullable=True,
        ),
        sa.Column("entidade_tipo", sa.String(length=40), nullable=False),
        sa.Column("entidade_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acao", sa.String(length=40), nullable=False),
        sa.Column("detalhes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_audit_logs_usuario_id", "audit_logs", ["usuario_id"])
    op.create_index(
        "ix_audit_logs_entidade", "audit_logs", ["entidade_tipo", "entidade_id"]
    )
    op.create_index("ix_audit_logs_criado_em", "audit_logs", ["criado_em"])


def downgrade():
    op.drop_index("ix_audit_logs_criado_em", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entidade", table_name="audit_logs")
    op.drop_index("ix_audit_logs_usuario_id", table_name="audit_logs")
    op.drop_table("audit_logs")
