"""stock_movements: historial de por qué cambió el stock de cada producto

Revision ID: 014
Revises: 013
Create Date: 2026-07-27

`products.stock` era un entero que se pisaba desde cuatro lugares distintos
sin dejar rastro. Esta tabla registra cada variación con su motivo, quién la
hizo y el stock resultante.

No se backfillea el historial de los productos ya existentes: no hay forma de
reconstruir movimientos que nunca se registraron. El historial arranca vacío
y se llena desde el primer movimiento posterior a este deploy. La suma de los
deltas, entonces, no va a coincidir con `products.stock` para los productos
anteriores -- es esperado, y por eso `stock_after` guarda el valor real de
cada momento en vez de depender de la suma.
"""

import sqlalchemy as sa
from alembic import op

revision      = "014"
down_revision = "013"
branch_labels = None
depends_on    = None

# Los valores son los que se muestran en pantalla, igual que en el ENUM de
# orders.status (ver app/models/order.py).
_REASONS = (
    "ALTA",
    "AJUSTE",
    "VENTA",
    "CANCELACION",
    "COMPRA",
)


def upgrade() -> None:
    op.create_table(
        "stock_movements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("stock_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Enum(*_REASONS, name="stockreason"), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # CASCADE: el historial de un producto borrado de verdad no tiene
        # sentido por separado. SET NULL en los otros dos: un movimiento
        # sobrevive al pedido o al usuario que lo originó, porque es un
        # registro contable y no una pertenencia de ellos.
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_stock_movements_product_id", "stock_movements", ["product_id"])
    op.create_index("ix_stock_movements_created_at", "stock_movements", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_stock_movements_created_at", table_name="stock_movements")
    op.drop_index("ix_stock_movements_product_id", table_name="stock_movements")
    op.drop_table("stock_movements")
    # El tipo ENUM sobrevive al DROP TABLE en Postgres y hay que borrarlo
    # aparte, o un downgrade+upgrade falla con "type already exists".
    sa.Enum(name="stockreason").drop(op.get_bind(), checkfirst=True)
