import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """De dónde salió el aviso.

    Se guarda el origen y no un ícono ni un color: eso es decisión de la
    interfaz y puede cambiar sin migración. Lo que la base tiene que saber es
    qué clase de hecho ocurrió.
    """

    ORDER_STATUS = "Estado del pedido"
    ORDER_PAYMENT = "Cobro del pedido"
    QUOTE_ANSWERED = "Cotización respondida"


class Notification(Base):
    """Un aviso persistido para una persona.

    El texto se guarda **ya redactado** y no se arma al momento de leer. Si un
    pedido pasa de Confirmado a Cancelado, la notificación vieja tiene que
    seguir diciendo lo que decía cuando se emitió: es el registro de algo que
    pasó, no una vista del estado actual. Armarla al leer la haría mentir sobre
    el pasado.
    """

    __tablename__ = "notifications"

    __table_args__ = (
        # Espeja los índices de la migración 020 para que `create_all()` los
        # cree también -- en desarrollo y en los tests el esquema no sale de
        # Alembic (ver backend/docker-entrypoint.sh).
        Index("ix_notifications_user_unread", "user_id", "read_at"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str | None] = mapped_column(String(400), nullable=True)
    # A dónde lleva al tocarla. Ruta relativa del frontend, no URL absoluta: el
    # dominio cambia entre desarrollo y producción y no tiene por qué quedar
    # congelado en la base.
    link: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # NULL = no leída.
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
