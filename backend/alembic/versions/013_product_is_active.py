"""products.is_active para separar "cargado" de "publicado en el catálogo"

Revision ID: 013
Revises: 012
Create Date: 2026-07-27

Hasta ahora la única forma de sacar un producto del catálogo era borrarlo
(`is_deleted`). Eso no sirve para el flujo de importación de facturas: un
producto recién importado tiene costo pero todavía no precio de venta, así
que publicarlo automáticamente lo mostraría como "Consultar" y, con stock 0,
ni siquiera se podría agregar al carrito. `is_active` agrega el estado
intermedio (borrador) y, de paso, permite sacar algo del catálogo sin
perder su historial.

CUIDADO AL DEPLOYAR: los productos existentes tienen que quedar en `true` o
el catálogo desaparece entero. Por eso van las dos cosas -- `server_default`
para las filas nuevas y un UPDATE explícito para las que ya están. El
`server_default` solo no alcanzaría si en el futuro alguien lo saca; el
UPDATE deja el estado correcto grabado en la base más allá del default.
"""

import sqlalchemy as sa
from alembic import op

revision      = "013"
down_revision = "012"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # Backfill explícito: todo lo que ya existía estaba publicado.
    op.execute("UPDATE products SET is_active = true")

    # El catálogo público filtra por (is_deleted, is_active) en cada request.
    op.create_index("ix_products_is_active", "products", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_column("products", "is_active")
