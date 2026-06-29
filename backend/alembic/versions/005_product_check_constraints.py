"""add check constraints to products (stock >= 0, price > 0)

Revision ID: 005
Revises: 004
Create Date: 2026-06-29

Agrega constraints a nivel de base de datos:
  - products.stock >= 0       (el stock no puede ser negativo)
  - products.price > 0        (si se informa precio, debe ser positivo)

price es nullable, por lo que el constraint aplica solo cuando no es NULL.
"""
from alembic import op

revision      = "005"
down_revision = "004"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_products_stock_nonnegative",
        "products",
        "stock >= 0",
    )
    op.create_check_constraint(
        "ck_products_price_positive",
        "products",
        "price IS NULL OR price > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_products_price_positive", "products", type_="check")
    op.drop_constraint("ck_products_stock_nonnegative", "products", type_="check")
