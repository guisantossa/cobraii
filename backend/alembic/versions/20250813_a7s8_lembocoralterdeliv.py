# alembic/versions/20250813_lembrete_ocorrencias_delivery.py
# flake8: noqa
import sqlalchemy as sa
from alembic import op

revision = "20250813_a7s8_lembocoralterdeliv"
down_revision = "20250813_6a5s4_create_templates"
branch_labels = None
depends_on = None


def upgrade():
    # 1) add delivered_at / provider_status
    op.add_column(
        "lembrete_ocorrencias",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "lembrete_ocorrencias", sa.Column("provider_status", sa.Text(), nullable=True)
    )

    # 2) tentativas -> integer (se já existir como texto)
    with op.batch_alter_table("lembrete_ocorrencias") as batch_op:
        batch_op.alter_column(
            "tentativas",
            type_=sa.Integer(),
            existing_type=sa.String(),
            postgresql_using="tentativas::integer",
            existing_nullable=False,
            server_default="0",
        )

    # 3) enum: adicionar 'entregue' (idempotente)
    op.execute(
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='status_ocorrencia_enum' AND e.enumlabel='entregue') THEN ALTER TYPE status_ocorrencia_enum ADD VALUE 'entregue'; END IF; END $$;"
    )

    # 4) índices úteis para analytics
    op.create_index(
        "ix_lembrete_ocorrencias_enviado_at", "lembrete_ocorrencias", ["enviado_at"]
    )
    op.create_index(
        "ix_lembrete_ocorrencias_delivered_at", "lembrete_ocorrencias", ["delivered_at"]
    )
    op.create_index(
        "ix_lembrete_ocorrencias_lembrete_id", "lembrete_ocorrencias", ["lembrete_id"]
    )


def downgrade():
    # drop índices
    op.drop_index(
        "ix_lembrete_ocorrencias_lembrete_id", table_name="lembrete_ocorrencias"
    )
    op.drop_index(
        "ix_lembrete_ocorrencias_delivered_at", table_name="lembrete_ocorrencias"
    )
    op.drop_index(
        "ix_lembrete_ocorrencias_enviado_at", table_name="lembrete_ocorrencias"
    )

    # voltar tentativas para string (se necessário)
    with op.batch_alter_table("lembrete_ocorrencias") as batch_op:
        batch_op.alter_column(
            "tentativas",
            type_=sa.String(),
            existing_type=sa.Integer(),
            postgresql_using="tentativas::text",
            existing_nullable=False,
            server_default="0",
        )

    # não removo coluna/enum no downgrade para evitar perda de dados
    op.drop_column("lembrete_ocorrencias", "provider_status")
    op.drop_column("lembrete_ocorrencias", "delivered_at")
