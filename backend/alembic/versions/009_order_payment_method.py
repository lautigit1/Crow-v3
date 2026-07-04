"""add payment_method to orders

Revision ID: 009
Revises: 008
Create Date: 2026-07-04
"""

from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column(
            "payment_method",
            sa.Enum(
                "Transferencia", "Mercado Pago", "Tarjeta", "Retiro en local (efectivo)",
                name="paymentmethod",
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("orders", "payment_method")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
