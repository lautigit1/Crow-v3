import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StockReason(str, enum.Enum):
    """Por qué se movió el stock.

    Los valores son los que se muestran en pantalla (mismo criterio que
    `OrderStatus` y `PaymentMethod` en models/order.py), así que cambiarlos
    exige una migración del tipo ENUM de Postgres.
    """

    ALTA = "Alta de producto"
    AJUSTE = "Ajuste manual"
    VENTA = "Venta"
    CANCELACION = "Cancelación de pedido"
    COMPRA = "Compra a proveedor"


class StockMovement(Base):
    """Una variación del stock de un producto.

    Hasta ahora `products.stock` era un entero suelto que se pisaba desde
    cuatro lugares distintos (alta, ajuste manual en Inventario, venta y
    cancelación de pedido) sin dejar rastro. Con el stock cambiando solo,
    "¿por qué este producto tiene 3 unidades si compré 20?" no tenía
    respuesta posible.

    Esta tabla es además el requisito para poder **revertir una importación
    de factura completa** (fase 4): sin ella habría que adivinar qué tocó
    cada carga.
    """

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Positivo entra, negativo sale. Nunca es 0: un movimiento que no mueve
    # nada es ruido, y el helper que los crea directamente no lo registra.
    delta: Mapped[int] = mapped_column(Integer, nullable=False)

    # Stock resultante, guardado en el momento. Es redundante con la suma de
    # los deltas, y esa redundancia es justamente el punto: permite detectar
    # si alguien tocó `products.stock` por fuera de este mecanismo (un UPDATE
    # a mano en la base, por ejemplo) comparando ambos valores.
    stock_after: Mapped[int] = mapped_column(Integer, nullable=False)

    reason: Mapped[StockReason] = mapped_column(Enum(StockReason), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Trazabilidad opcional hacia el origen del movimiento.
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )
    # SET NULL y no CASCADE: si se borra el usuario, el movimiento tiene que
    # sobrevivir. El historial de stock es un registro contable, no una
    # pertenencia del usuario que lo generó.
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Agrupa todos los movimientos generados por una misma factura. Es lo que
    # hace posible revertir una importación entera sin adivinar qué tocó.
    import_batch_id: Mapped[int | None] = mapped_column(
        ForeignKey("import_batches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    product: Mapped["Product"] = relationship("Product")  # type: ignore[name-defined]  # noqa: F821 -- forward ref resuelta por el mapper registry en runtime
