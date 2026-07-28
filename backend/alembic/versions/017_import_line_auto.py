"""import_lines.is_auto: marcar las líneas que salieron de una extracción

Revision ID: 017
Revises: 016
Create Date: 2026-07-27

Una línea tipeada por una persona y una extraída de un PDF automáticamente no
merecen la misma confianza. La revisión las distingue visualmente para que la
atención se concentre donde puede haber errores de lectura.

Default `false`: las que ya existen fueron tipeadas o salieron de un Excel con
mapeo confirmado por el usuario, así que ninguna es automática en este sentido.
"""

import sqlalchemy as sa
from alembic import op

revision      = "017"
down_revision = "016"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "import_lines",
        sa.Column("is_auto", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("import_lines", "is_auto")
