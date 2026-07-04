"""add cost_price and margin_pct to products

Revision ID: 010
Revises: 009
Create Date: 2026-07-04
"""

from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("cost_price", sa.Numeric(12, 2), nullable=True))
    op.add_column("products", sa.Column("margin_pct", sa.Numeric(6, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "margin_pct")
    op.drop_column("products", "cost_price")
