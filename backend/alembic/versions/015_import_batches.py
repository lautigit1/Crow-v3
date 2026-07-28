"""import_batches / import_lines: importación de facturas de proveedor

Revision ID: 015
Revises: 014
Create Date: 2026-07-27

Tres cosas:

  1. `import_batches` + `import_lines`: una factura subida y sus líneas. El
     lote nace en BORRADOR y no toca `products` ni el stock hasta que se
     confirma, así una interpretación equivocada del archivo no se convierte
     en inventario equivocado.

  2. `stock_movements.import_batch_id`: la columna que quedó pendiente en la
     migración 014 (no se podía crear la FK antes de que existiera la tabla
     destino). Es lo que permite revertir una importación completa: se
     buscan todos los movimientos del lote y se generan los inversos.

  3. `suppliers.column_mapping`: qué columna del Excel de ESE proveedor es el
     SKU, cuál la descripción, etc. Se guarda la primera vez y se reusa en
     las siguientes facturas. Ver la decisión D1 en tasks.md.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision      = "015"
down_revision = "014"
branch_labels = None
depends_on    = None

_STATUS = ("BORRADOR", "CONFIRMADO", "REVERTIDO")
_RESOLUTION = ("NUEVO", "REPOSICION", "CONFLICTO", "IGNORAR")


def upgrade() -> None:
    op.create_table(
        "import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("declared_total", sa.Numeric(14, 2), nullable=True),
        sa.Column("status", sa.Enum(*_STATUS, name="importstatus"), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_import_batches_supplier_id", "import_batches", ["supplier_id"])

    op.create_table(
        "import_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(40), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("resolution", sa.Enum(*_RESOLUTION, name="lineresolution"), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["batch_id"], ["import_batches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_import_lines_batch_id", "import_lines", ["batch_id"])

    # La columna que la 014 no pudo crear: la tabla destino no existía todavía.
    op.add_column("stock_movements", sa.Column("import_batch_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_stock_movements_import_batch",
        "stock_movements", "import_batches",
        ["import_batch_id"], ["id"],
        ondelete="SET NULL",
    )

    # JSONB y no JSON: permite indexar y consultar por clave si alguna vez
    # hace falta. El default es un objeto vacío para no tener que distinguir
    # entre "sin mapeo" y NULL en el código.
    op.add_column(
        "suppliers",
        sa.Column("column_mapping", postgresql.JSONB(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("suppliers", "column_mapping")
    op.drop_constraint("fk_stock_movements_import_batch", "stock_movements", type_="foreignkey")
    op.drop_column("stock_movements", "import_batch_id")
    op.drop_index("ix_import_lines_batch_id", table_name="import_lines")
    op.drop_table("import_lines")
    op.drop_index("ix_import_batches_supplier_id", table_name="import_batches")
    op.drop_table("import_batches")
    # Los tipos ENUM sobreviven al DROP TABLE en Postgres; sin esto un
    # downgrade+upgrade falla con "type already exists".
    sa.Enum(name="lineresolution").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="importstatus").drop(op.get_bind(), checkfirst=True)
