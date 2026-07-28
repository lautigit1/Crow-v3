"""Guardar el archivo original de la factura junto al lote

Revision ID: 016
Revises: 015
Create Date: 2026-07-27

Hasta ahora solo se guardaba el nombre del archivo. Para la carga asistida de
PDF hace falta el archivo en sí: la pantalla lo muestra al lado de la grilla
mientras se cargan las líneas a mano.

**Por qué en la base y no en disco o en Cloudinary.** Una factura pesa entre
100 y 500 KB y llegan del orden de 30 por mes: unos 15 MB al año, que para
Postgres no es nada. Guardarlas acá evita montar un volumen nuevo (y
mantenerlo sincronizado entre dev y producción), y hace que los backups de la
base incluyan las facturas -- que para un comprobante fiscal es más una
ventaja que un costo. Cloudinary queda descartado por otro motivo: son
documentos con precios de costo, no imágenes públicas de catálogo.

Si algún día el volumen crece de verdad, mover esto a almacenamiento externo
es un cambio contenido: la columna se lee desde un solo endpoint.
"""

import sqlalchemy as sa
from alembic import op

revision      = "016"
down_revision = "015"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.add_column("import_batches", sa.Column("file_content", sa.LargeBinary(), nullable=True))
    op.add_column("import_batches", sa.Column("content_type", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("import_batches", "content_type")
    op.drop_column("import_batches", "file_content")
