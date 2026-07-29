import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDIENTE = "Pendiente"
    CONFIRMADO = "Confirmado"
    EN_PROCESO = "En proceso"
    ENVIADO = "Enviado"
    ENTREGADO = "Entregado"
    CANCELADO = "Cancelado"


class PaymentMethod(str, enum.Enum):
    TRANSFERENCIA = "Transferencia"
    MERCADO_PAGO = "Mercado Pago"
    TARJETA = "Tarjeta"
    EFECTIVO_LOCAL = "Retiro en local (efectivo)"


class PaymentStatus(str, enum.Enum):
    """En qué punto está el COBRO, que es independiente de la entrega.

    `OrderStatus` responde "¿en qué punto está la entrega?" y este responde
    "¿ya me pagó?". Son preguntas ortogonales: un pedido puede estar Pagado y
    En proceso (pagó por adelantado), o Entregado y Sin cobrar (cliente de
    confianza que paga a fin de mes). Meterlas en un solo enum obligaría a
    inventar estados híbridos imposibles de desarmar después.

    No hay validación de transiciones ni entre estos valores ni contra el
    estado de entrega, y es a propósito: el cobro pasa por fuera del sistema
    (link de Mercado Pago mandado por WhatsApp), así que el sistema no tiene
    forma de conocer la verdad. Poner reglas acá solo lograría que el admin no
    pueda registrar lo que realmente pasó.
    """

    SIN_COBRAR = "Sin cobrar"
    LINK_ENVIADO = "Link enviado"
    PAGADO = "Pagado"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.PENDIENTE, nullable=False)
    # Nullable a propósito -- pedidos creados por otros caminos (ej. el modal
    # de "Nuevo pedido" en Mis Pedidos) no siempre indican un método de pago.
    # Mercado Pago todavía no está configurado como pasarela real: por ahora
    # es solo una opción más que el cliente elige, el cobro se coordina igual
    # que transferencia/efectivo.
    payment_method: Mapped[PaymentMethod | None] = mapped_column(Enum(PaymentMethod), nullable=True)
    # Migración 019. `server_default` además del `default` de Python: el default
    # de SQLAlchemy solo aplica a las filas que inserta el ORM, y acá hace falta
    # que las que ya existían en la base también queden en un valor válido.
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.SIN_COBRAR,
        # `.name`, no `.value`: SQLAlchemy guarda el NOMBRE del miembro en la
        # base ("SIN_COBRAR"), así que el default del servidor tiene que estar
        # escrito en ese mismo idioma o las filas insertadas por fuera del ORM
        # quedarían con una etiqueta que el tipo no acepta.
        server_default=PaymentStatus.SIN_COBRAR.name,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    user: Mapped["User"] = relationship("User")  # type: ignore[name-defined]  # noqa: F821 -- forward ref resuelta por el mapper registry de SQLAlchemy en runtime


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Snapshots at order time so product edits don't affect past orders
    sku_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    unit_price_snapshot: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product")  # type: ignore[name-defined]  # noqa: F821 -- forward ref resuelta por el mapper registry de SQLAlchemy en runtime
