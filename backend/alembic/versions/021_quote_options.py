"""quote options + answered_at + order_id

Revision ID: 021
Revises: 020
Create Date: 2026-07-30

La cotización guardaba lo que pedía el cliente y su estado, pero no la
respuesta: ni precio, ni plazo. En un negocio que trae a pedido, esa respuesta
ES la venta, así que quedaba entera fuera del sistema.

Las opciones van como FILAS y no como columnas (`precio_1`, `precio_2`...):
cotizar un repuesto casi siempre implica ofrecer alternativas -- original,
alternativo, usado -- y no hay un número fijo de ellas.
"""
from alembic import op
import sqlalchemy as sa

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quote_options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "quote_id",
            sa.Integer(),
            sa.ForeignKey("quotes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("detail", sa.String(400), nullable=True),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        # Texto y no un entero de días: lo que se le dice al cliente es "3 a 5
        # días" o "depende de si lo tiene el importador". Un campo numérico
        # obligaría a inventar una precisión que no se tiene.
        sa.Column("lead_time", sa.String(60), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.create_index("ix_quote_options_quote_id", "quote_options", ["quote_id"])

    # Fecha y no booleano, mismo criterio que `read_at` en notifications:
    # responde además cuánto se tardó en contestar.
    op.add_column("quotes", sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True))
    # El enlace vive en `quotes` y no al revés: la cotización es la que tiene
    # vida más larga y la que se consulta. Y deja explícito que una cotización
    # genera como mucho UN pedido.
    op.add_column("quotes", sa.Column("order_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_quotes_order_id", "quotes", "orders", ["order_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_quotes_order_id", "quotes", type_="foreignkey")
    op.drop_column("quotes", "order_id")
    op.drop_column("quotes", "answered_at")
    op.drop_index("ix_quote_options_quote_id", table_name="quote_options")
    op.drop_table("quote_options")
