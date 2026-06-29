"""add partial indexes on products for catalog queries

Revision ID: 006
Revises: 005
Create Date: 2026-06-29

Agrega partial indexes WHERE is_deleted = false sobre las columnas usadas
frecuentemente en las queries del catálogo:

  - category_id   → GET /products?category_id=X
  - brand_id      → GET /products?brand_id=X
  - vehicle_type  → GET /products?vehicle_type=X
  - is_featured   → homepage y sección de destacados

Un partial index solo indexa las filas que cumplen la condición (en este
caso, productos no eliminados). Es más chico y más rápido que un índice
compuesto completo porque Postgres descarta las filas soft-deleted antes
de construir el árbol B-tree.

Nota: postgresql_where hace estos índices específicos de Postgres.
"""

import sqlalchemy as sa
from alembic import op

revision      = "006"
down_revision = "005"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_index(
        "ix_products_active_category",
        "products",
        ["category_id"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "ix_products_active_brand",
        "products",
        ["brand_id"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "ix_products_active_vehicle",
        "products",
        ["vehicle_type"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "ix_products_active_featured",
        "products",
        ["is_featured"],
        postgresql_where=sa.text("is_deleted = false"),
    )


def downgrade() -> None:
    op.drop_index("ix_products_active_featured", table_name="products")
    op.drop_index("ix_products_active_vehicle", table_name="products")
    op.drop_index("ix_products_active_brand", table_name="products")
    op.drop_index("ix_products_active_category", table_name="products")
