import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250812_as9d8_lembretes"  # pragma: allowlist secret
down_revision = (
    "59475a5f2383"  # ajuste para a última revision existente # pragma: allowlist secret
)
branch_labels = None
depends_on = None


def upgrade():

    canal_enum = sa.Enum("whatsapp", "email", "sms", name="canal_lembrete_enum")
    canal_enum.create(op.get_bind(), checkfirst=True)

    status_enum = sa.Enum(
        "pendente",
        "enviado",
        "erro",
        "cancelado",
        "skipped",
        name="status_ocorrencia_enum",
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "lembretes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id"),
            nullable=False,
        ),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id"),
            nullable=False,
        ),
        sa.Column(
            "fatura_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("faturas.id"),
            nullable=True,
        ),
        sa.Column("titulo", sa.Text(), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=True),
        sa.Column("canal", canal_enum, nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("rrule", sa.Text(), nullable=True),
        sa.Column("dtstart", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "tz", sa.String(), nullable=False, server_default="America/Sao_Paulo"
        ),
        sa.Column("offsets", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("condicao", sa.String(), nullable=False, server_default="sempre"),
        sa.Column(
            "ativa", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
        sa.Column("proxima_execucao_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
    )

    op.create_table(
        "lembrete_ocorrencias",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "lembrete_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lembretes.id"),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", status_enum, nullable=False, server_default="pendente"),
        sa.Column("motivo_skip", sa.Text(), nullable=True),
        sa.Column("tentativas", sa.String(), nullable=False, server_default="0"),
        sa.Column("enviado_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canal_message_id", sa.Text(), nullable=True),
        sa.Column(
            "retorno_gateway", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "payload_enviado", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")
        ),
    )

    # Constraint lógica: ou periódico (rrule) OU de fatura (fatura_id+offsets)
    op.create_check_constraint(
        "ck_lembretes_tipo_exclusivo",
        "lembretes",
        # (rrule IS NOT NULL) XOR (fatura_id IS NOT NULL AND offsets IS NOT NULL)
        "( (rrule IS NOT NULL AND fatura_id IS NULL AND offsets IS NULL)"
        " OR (rrule IS NULL AND fatura_id IS NOT NULL AND offsets IS NOT NULL) )",
    )


def downgrade():
    op.drop_constraint("ck_lembretes_tipo_exclusivo", "lembretes", type_="check")
    op.drop_table("lembrete_ocorrencias")
    op.drop_table("lembretes")

    status_enum = sa.Enum(name="status_ocorrencia_enum")
    status_enum.drop(op.get_bind(), checkfirst=True)

    canal_enum = sa.Enum(name="canal_lembrete_enum")
    canal_enum.drop(op.get_bind(), checkfirst=True)
