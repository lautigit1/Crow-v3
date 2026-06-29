"""add deleted_at to products

Revision ID: 004
Revises: 003
Create Date: 2026-06-29

Agrega la columna deleted_at (TIMESTAMP WITH TIME ZONE, nullable) a la tabla
products. Se setea automáticamente al momento del soft delete y vuelve a NULL
cuando el producto es restaurado. Permite mostrar cuándo fue eliminado cada
producto en el panel de administración, con precisión de zona horaria.
"""
from alembic import op
import sqlalchemy as sa

revision      = "004"
down_revision = "003"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, default=None),
    )


def downgrade() -> None:
    op.drop_column("products", "deleted_at")
