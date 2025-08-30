# alembic revision: add_is_admin_to_usuarios
import sqlalchemy as sa
from alembic import op

revision = "20250830_03"
down_revision = "20250830_02"


def upgrade():
    op.add_column(
        "usuarios",
        sa.Column(
            "is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )
    op.alter_column("usuarios", "is_admin", server_default=None)


def downgrade():
    op.drop_column("usuarios", "is_admin")
