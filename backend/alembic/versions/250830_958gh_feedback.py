# alembic revision -> upgrade()

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20250830_02"  # pragma: allowlist secret
down_revision = (
    "20250830_01"  # ajuste para a última revision existente # pragma: allowlist secret
)
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "feedbacks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id"),
            nullable=True,
            index=True,
        ),
        sa.Column("origem", sa.String(80), nullable=True),
        sa.Column(
            "tipo",
            sa.Enum(
                "bug",
                "sugestao",
                "elogio",
                "nps",
                "upgrade_reason",
                "usabilidade",
                name="feedback_tipo_enum",
            ),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("comentario", sa.Text(), nullable=True),
        sa.Column("contexto", sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
    )


def downgrade():
    op.drop_table("feedbacks")
    op.execute("DROP TYPE IF EXISTS feedback_tipo_enum")
