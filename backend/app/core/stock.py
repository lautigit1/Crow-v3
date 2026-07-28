"""Punto único de cambio del stock de un producto.

Antes `product.stock` se modificaba directamente desde cuatro lugares
(`routes/orders.py` al vender y al cancelar, `routes/products.py` al crear y
al ajustar a mano). Cada uno funcionaba, pero ninguno dejaba registro, y el
quinto lugar que se agregara iba a olvidarse de dejarlo también.

La regla es: **nadie escribe `product.stock` fuera de este módulo.** Si hace
falta mover stock, se llama a `mover_stock()`, que actualiza el producto y
graba el movimiento en la misma operación. Así el historial no puede quedar
desincronizado por descuido.
"""

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.stock_movement import StockMovement, StockReason
from app.models.user import User


def mover_stock(
    db: Session,
    product: Product,
    delta: int,
    reason: StockReason,
    *,
    actor: User | None = None,
    order_id: int | None = None,
    note: str | None = None,
) -> StockMovement | None:
    """Aplica `delta` al stock de `product` y registra el movimiento.

    Devuelve `None` si `delta` es 0: guardar un movimiento que no mueve nada
    solo ensucia el historial. Es un caso normal, no un error -- pasa cada vez
    que se guarda el formulario de un producto sin tocar el stock.

    No hace commit: como el resto de las rutas, deja que `get_db()` cierre la
    transacción del request (ver core/database.py). Eso es lo que garantiza
    que el stock y su movimiento se guarden juntos o no se guarde ninguno.
    """
    if delta == 0:
        return None

    nuevo = product.stock + delta
    if nuevo < 0:
        # No debería llegar acá: quien vende valida el stock disponible antes.
        # Si pasa, es un bug de quien llama, y conviene que explote acá y no
        # que Postgres rechace el INSERT por la CHECK constraint con un
        # mensaje mucho menos claro.
        raise ValueError(
            f"El movimiento dejaría el stock de '{product.name}' en {nuevo}. "
            f"Stock actual {product.stock}, delta {delta}."
        )

    product.stock = nuevo
    db.add(product)

    movimiento = StockMovement(
        product_id=product.id,
        delta=delta,
        stock_after=nuevo,
        reason=reason,
        note=note,
        order_id=order_id,
        actor_id=actor.id if actor else None,
    )
    db.add(movimiento)
    return movimiento
