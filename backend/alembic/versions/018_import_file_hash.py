"""import_batches.file_hash: detectar facturas ya importadas

Revision ID: 018
Revises: 017
Create Date: 2026-07-27

SHA-256 del archivo subido. Sirve para avisar antes de procesar que esa misma
factura ya se importó: confirmarla dos veces suma el stock dos veces, y sin
este aviso el error solo se descubre cuando el inventario no cuadra.

Es una detección EXACTA, sobre los bytes. Si el proveedor reexporta la misma
factura, el archivo cambia y el hash también, así que ese caso no lo cubre.
Para eso queda el segundo control, que ya existe: el total declarado y la
revisión antes de confirmar.

Nullable porque los lotes anteriores a esta migración no tienen archivo
hasheado y no hay forma de calcularlo para los que se subieron antes de la
016 (no se guardaba el contenido).
"""

import sqlalchemy as sa
from alembic import op

revision      = "018"
down_revision = "017"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column("import_batches", sa.Column("file_hash", sa.String(64), nullable=True))
    # Índice porque la consulta de "¿ya subí esto?" corre antes de cada
    # importación, con el hash como única condición.
    op.create_index("ix_import_batches_file_hash", "import_batches", ["file_hash"])


def downgrade() -> None:
    op.drop_index("ix_import_batches_file_hash", table_name="import_batches")
    op.drop_column("import_batches", "file_hash")
