"""users.token_version para invalidar sesiones al cambiar la contraseña

Revision ID: 012
Revises: 011
Create Date: 2026-07-10

Los JWT (access y refresh) pasan a llevar un claim `ver` con el valor de
users.token_version al momento de emitirse. Cambiar o resetear la contraseña
incrementa la columna, con lo que todos los tokens emitidos antes del cambio
dejan de validar de inmediato (antes seguían siendo válidos hasta expirar,
dejándole la sesión abierta a un atacante que ya la hubiera robado).

Los tokens emitidos antes de este deploy no tienen el claim `ver`; se los
trata como versión 0, que coincide con el default de la columna, así que
las sesiones vigentes no se cortan al deployar.
"""

import sqlalchemy as sa
from alembic import op

revision      = "012"
down_revision = "011"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("users", "token_version")
