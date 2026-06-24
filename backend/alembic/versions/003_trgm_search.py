"""enable pg_trgm and add GIN indices for full-text product search

Revision ID: 003
Revises: 002
Create Date: 2026-06-24

pg_trgm lets Postgres use a GIN index to accelerate LIKE/ILIKE queries with
leading wildcards (e.g. `name ILIKE '%filtro%'`).  Without this, those queries
do a full sequential scan regardless of row count.

After this migration the existing ILIKE filters in products.py will
automatically use the GIN index — no query changes needed.
"""
from alembic import op

revision      = "003"
down_revision = "002"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # Enable trigram extension (idempotent — safe to run on existing DBs)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # GIN index on products.name — covers the most common search field
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_name_trgm "
        "ON products USING gin (name gin_trgm_ops)"
    )

    # GIN index on products.description — covers keyword searches
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_description_trgm "
        "ON products USING gin (description gin_trgm_ops)"
    )

    # GIN index on products.sku — shorter field, btree is fine but trgm allows
    # partial SKU matches (e.g. searching "F15" hits "OIL-F150-5W30")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_products_sku_trgm "
        "ON products USING gin (sku gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_sku_trgm")
    op.execute("DROP INDEX IF EXISTS ix_products_description_trgm")
    op.execute("DROP INDEX IF EXISTS ix_products_name_trgm")
    # Note: we do NOT drop pg_trgm on downgrade — other parts of the DB may use it.
