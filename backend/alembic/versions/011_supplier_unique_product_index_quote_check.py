"""suppliers.name unique, products(category_id, stock) index, quotes.message check

Revision ID: 011
Revises: 010
Create Date: 2026-07-05

Cierra tres hallazgos de la auditoría técnica que seguían pendientes:

  - suppliers.name sin UNIQUE  -> permitía proveedores duplicados por typo
    o doble carga. Se agrega constraint único (case-insensitive vía lower()
    no es necesario acá porque el admin es el único que carga proveedores;
    UNIQUE simple sobre el valor tal cual se ingresa).
  - Falta índice compuesto para el filtro más común del catálogo:
    category + control de stock (ej. "productos de esta categoría con
    stock > 0"). Partial index WHERE is_deleted = false, mismo criterio
    que los índices de la migración 006.
  - quotes.message sin longitud mínima a nivel de base de datos (solo
    Pydantic la validaba, con min_length=1). Se agrega CHECK que rechaza
    mensajes vacíos o solo espacios, para que la garantía no dependa
    únicamente de la capa de aplicación.
"""

import sqlalchemy as sa
from alembic import op

revision      = "011"
down_revision = "010"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_unique_constraint("uq_suppliers_name", "suppliers", ["name"])

    op.create_index(
        "ix_products_active_category_stock",
        "products",
        ["category_id", "stock"],
        postgresql_where=sa.text("is_deleted = false"),
    )

    op.create_check_constraint(
        "ck_quotes_message_not_blank",
        "quotes",
        "length(btrim(message)) > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_quotes_message_not_blank", "quotes", type_="check")
    op.drop_index("ix_products_active_category_stock", table_name="products")
    op.drop_constraint("uq_suppliers_name", "suppliers", type_="unique")
