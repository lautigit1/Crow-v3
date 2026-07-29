"""add payment_status to orders

Revision ID: 019
Revises: 018
Create Date: 2026-07-28

El estado del pedido que ya existía describe LA ENTREGA (Pendiente →
Confirmado → En proceso → Enviado → Entregado). No había dónde anotar si el
cliente pagó, y como el cobro se coordina por WhatsApp -- fuera del sitio --
esa es justamente la pregunta más frecuente del admin.

Va como columna propia y no como estados nuevos del enum de entrega porque son
dos ejes independientes: "Pagado + En proceso" (pagó por adelantado, lo estoy
armando) y "Entregado + Sin cobrar" (cliente de confianza que paga a fin de
mes) son los dos situaciones reales, y un enum único no puede expresarlas.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None

# El tipo se declara con `create_type=False` y se crea a mano más abajo.
#
# Motivo: `op.add_column()` con un `sa.Enum` NO emite el CREATE TYPE. Alembic
# solo crea el tipo cuando crea la tabla entera, así que un ALTER TABLE ADD
# COLUMN sobre una base donde el tipo no existe falla con:
#
#     (psycopg2.errors.UndefinedObject) type "paymentstatus" does not exist
#
# La migración 009 (`paymentmethod`) tiene el mismo problema y nunca se notó
# porque en las bases donde corrió el tipo ya existía, creado por
# `create_all()` desde el modelo. No hace falta arreglarla: con el entrypoint
# actual, una base vacía se marca directamente en head y nunca vuelve a
# ejecutar la cadena vieja.
# Las etiquetas son los NOMBRES de los miembros del enum de Python, no sus
# valores legibles.
#
# SQLAlchemy persiste `PaymentStatus.SIN_COBRAR` como la cadena "SIN_COBRAR",
# no como "Sin cobrar" -- por defecto usa `.name`, no `.value`. Así que el tipo
# de Postgres tiene que tener esas etiquetas o el INSERT falla con
# "invalid input value for enum paymentstatus".
#
# Es además lo que ya hay en la base: los tipos `orderstatus`, `paymentmethod`
# y `quotestatus` los creó `create_all()` desde los modelos, o sea con nombres.
#
# OJO: las migraciones viejas (007, 009) declararon esos mismos tipos con los
# VALORES legibles ("Pendiente", "Transferencia"). Nunca rompió porque en toda
# base real el tipo ya existía creado por `create_all()` y el CREATE TYPE de la
# migración era letra muerta. Una base construida solo con migraciones tendría
# pedidos rotos. No se toca acá: con el entrypoint actual una base vacía se
# arma con `create_all()` y se marca en head, así que esa cadena nunca corre.
payment_status = postgresql.ENUM(
    "SIN_COBRAR", "LINK_ENVIADO", "PAGADO",
    name="paymentstatus",
    create_type=False,
)


def upgrade() -> None:
    # `checkfirst=True` la vuelve idempotente: si el tipo ya existe -- porque
    # la base se armó con `create_all()` desde un modelo que ya tenía la
    # columna -- no falla, sigue de largo.
    payment_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "orders",
        sa.Column(
            "payment_status",
            payment_status,
            nullable=False,
            server_default="SIN_COBRAR",
        ),
    )
    # El server_default ya cubre las filas existentes, pero el UPDATE explícito
    # va igual: es la lección de la 013, donde depender solo del default habría
    # dejado el catálogo público vacío si algo se comportaba distinto de lo
    # esperado. Es barato y hace que la intención quede escrita.
    op.execute("UPDATE orders SET payment_status = 'SIN_COBRAR' WHERE payment_status IS NULL")


def downgrade() -> None:
    op.drop_column("orders", "payment_status")
    # Dropear también el TIPO, no solo la columna: en Postgres el enum sobrevive
    # a la columna que lo usaba, y volver a aplicar esta migración fallaría con
    # "type paymentstatus already exists". Mismo criterio que la 009.
    op.execute("DROP TYPE IF EXISTS paymentstatus")
