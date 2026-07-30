"""notifications table

Revision ID: 020
Revises: 019
Create Date: 2026-07-29

El canal SSE resolvió que las pantallas se actualicen sin recargar. Lo que
faltaba era persistencia: un lugar donde el aviso quede esperando a que la
persona vuelva. Hoy, si el admin no tenía el panel abierto cuando entró un
pedido, no queda rastro de que entró.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None

# Etiquetas = NOMBRES de los miembros del enum de Python, no sus valores.
# SQLAlchemy persiste `.name`, así que el tipo de Postgres tiene que hablar ese
# idioma o el INSERT falla con "invalid input value for enum". Es la lección de
# la migración 019, donde esto se descubrió recién al levantar el stack.
notification_type = postgresql.ENUM(
    "ORDER_STATUS", "ORDER_PAYMENT", "QUOTE_ANSWERED",
    name="notificationtype",
    create_type=False,
)


def upgrade() -> None:
    # `checkfirst=True` la vuelve idempotente y `create_type=False` evita que
    # `create_table` intente crear el tipo por segunda vez.
    notification_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", notification_type, nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("body", sa.String(400), nullable=True),
        sa.Column("link", sa.String(200), nullable=True),
        # NULL = no leída. Fecha y no booleano: cuesta lo mismo y además
        # responde cuánto tardó la persona en verla.
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )

    # El índice que sostiene la consulta más frecuente de toda la app: el
    # contador de no leídas del navbar, que corre en cada carga de página. Sin
    # esto es un scan de la tabla completa a medida que crece.
    op.create_index(
        "ix_notifications_user_unread",
        "notifications",
        ["user_id", "read_at"],
    )
    # Para la lista paginada, que ordena por fecha descendente.
    op.create_index(
        "ix_notifications_user_created",
        "notifications",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_created", table_name="notifications")
    op.drop_index("ix_notifications_user_unread", table_name="notifications")
    op.drop_table("notifications")
    # El tipo sobrevive a la tabla en Postgres: sin este DROP, reaplicar la
    # migración falla con "type already exists".
    op.execute("DROP TYPE IF EXISTS notificationtype")
