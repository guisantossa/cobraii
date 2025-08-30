# app/alembic/versions/20250830_01_add_planos_and_usuario_fk.py
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# IDs fixos para rastreabilidade (mantém consistência entre ambientes)
REVISION_FREE = "00000000-0000-0000-0000-000000000001"
REVISION_START = "00000000-0000-0000-0000-000000000002"
REVISION_PRO = "00000000-0000-0000-0000-000000000003"

# revision identifiers, used by Alembic.
revision = "20250830_01"
down_revision = "250820_a9s7d_add_index"
branch_labels = None
depends_on = None


def upgrade():
    # 1) Tabela planos
    op.create_table(
        "planos",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column("nome", sa.String(length=100), nullable=False, unique=True),
        sa.Column(
            "usa_email", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "usa_sms", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "usa_zap", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        # valores em BRL
        sa.Column(
            "valor_mensal", sa.Numeric(10, 2), nullable=False, server_default="0.00"
        ),
        sa.Column(
            "valor_anual", sa.Numeric(10, 2), nullable=False, server_default="0.00"
        ),
        # limite de lembretes ativos (null = ilimitado)
        sa.Column("limites", sa.Integer(), nullable=True),
    )

    # 2) Seed dos 3 planos
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO planos (id, nome, usa_email, usa_sms, usa_zap, valor_mensal, valor_anual, limites)
            VALUES
              (:id1, :n1, true, false, true, :m1, :a1, :l1),
              (:id2, :n2, true, true,  true, :m2, :a2, :l2),
              (:id3, :n3, true, true,  true, :m3, :a3, :l3)
        """
        ),
        {
            "id1": REVISION_FREE,
            "n1": "free",
            "m1": 0.00,
            "a1": 0.00,
            "l1": 2,
            "id2": REVISION_START,
            "n2": "plano start",
            "m2": 6.99,
            "a2": 4.99,
            "l2": 10,
            "id3": REVISION_PRO,
            "n3": "plano pro",
            "m3": 12.99,
            "a3": 9.99,
            "l3": None,
        },
    )

    # 3) Coluna plano_id em usuarios (primeiro nullable)
    op.add_column(
        "usuarios", sa.Column("plano_id", postgresql.UUID(as_uuid=True), nullable=True)
    )

    # 4) Preenche usuários existentes com plano "free"
    conn.execute(
        sa.text("UPDATE usuarios SET plano_id = :pid WHERE plano_id IS NULL"),
        {"pid": REVISION_FREE},
    )

    # 5) NOT NULL + FK + índice
    op.alter_column("usuarios", "plano_id", nullable=False)
    op.create_foreign_key(
        "fk_usuarios_plano_id",
        source_table="usuarios",
        referent_table="planos",
        local_cols=["plano_id"],
        remote_cols=["id"],
        onupdate="CASCADE",
        ondelete="RESTRICT",
    )
    op.create_index("ix_usuarios_plano_id", "usuarios", ["plano_id"])


def downgrade():
    # Reverte na ordem contrária
    op.drop_index("ix_usuarios_plano_id", table_name="usuarios")
    op.drop_constraint("fk_usuarios_plano_id", "usuarios", type_="foreignkey")
    op.drop_column("usuarios", "plano_id")
    op.drop_table("planos")
