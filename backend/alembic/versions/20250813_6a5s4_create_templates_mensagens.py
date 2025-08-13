"""create templates_mensagem"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Rev IDs
revision = "20250813_6a5s4_create_templates"
down_revision = "20250812_as9d8_lembretes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ATENÇÃO: se seu projeto já possui o tipo "canal_lembrete_enum" criado por outros models,
    # você NÃO precisa recriá-lo aqui. O Alembic usará o existente.
    # Caso esteja criando do zero, descomente o bloco abaixo para criar o enum:
    #
    # canal_enum = postgresql.ENUM('whatsapp', 'email', 'sms', 'todos', name='canal_lembrete_enum')
    # canal_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "templates_mensagem",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuarios.id"),
            nullable=False,
        ),
        sa.Column("titulo", sa.String(length=120), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=False),
        sa.Column(
            "placeholders", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column(
            "canal",
            postgresql.ENUM(
                "whatsapp",
                "email",
                "sms",
                "todos",
                name="canal_lembrete_enum",
                create_type=False,  # <- chave: NÃO tentar criar o tipo
            ),
            nullable=True,
        ),
        sa.Column(
            "criado_em",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_templates_mensagem_usuario_id", "templates_mensagem", ["usuario_id"]
    )

    # Trigger simples de updated_at (opcional, caso você use no banco)
    # Se preferir manter o onupdate do SQLAlchemy apenas, pode ignorar.
    # Aqui deixo comentado por ser opcional.
    # op.execute("""
    # CREATE OR REPLACE FUNCTION set_updated_at()
    # RETURNS TRIGGER AS $$
    # BEGIN
    #   NEW.atualizado_em = NOW();
    #   RETURN NEW;
    # END;
    # $$ language 'plpgsql';
    # """)
    # op.execute("""
    # CREATE TRIGGER trg_templates_mensagem_updated
    # BEFORE UPDATE ON templates_mensagem
    # FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
    # """)


def downgrade() -> None:
    # op.execute("DROP TRIGGER IF EXISTS trg_templates_mensagem_updated ON templates_mensagem;")
    # op.execute("DROP FUNCTION IF EXISTS set_updated_at;")

    op.drop_index("ix_templates_mensagem_usuario_id", table_name="templates_mensagem")
    op.drop_table("templates_mensagem")

    # Não dropa o enum compartilhado se ele for usado por outras tabelas!
    # Se você criou o enum só para esta tabela, poderia dropar aqui:
    # canal_enum = postgresql.ENUM(name='canal_lembrete_enum')
    # canal_enum.drop(op.get_bind(), checkfirst=True)
