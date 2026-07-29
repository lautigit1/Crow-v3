from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core import audit, events
from app.core.deps import AdminUser, CurrentUser, DbSession
from app.core.ratelimit import LoginRateLimiter
from app.core.stock import mover_stock
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product
from app.models.stock_movement import StockReason
from app.models.user import User
from app.schemas.order import (
    AdminOrderList,
    AdminOrderRead,
    OrderCreate,
    OrderList,
    OrderRead,
    OrderStatusUpdate,
)

router = APIRouter()

# Max 10 orders per hour per user — an authenticated attacker (or a bug in the
# frontend) shouldn't be able to flood the orders table.
_order_limiter = LoginRateLimiter(max_attempts=10, window_seconds=3600, lockout_seconds=1800)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_order_or_404(order_id: int, db: DbSession) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


def _restore_stock(order: Order, db: DbSession, actor: User | None = None) -> None:
    """Devuelve el stock de los ítems de un pedido (al cancelarlo).

    Los productos borrados desde el pedido (product_id en NULL por el
    SET NULL del FK) o soft-deleted simplemente se saltean.
    """
    for item in order.items:
        if item.product_id is None:
            continue
        product = db.scalar(
            select(Product).where(Product.id == item.product_id).with_for_update()
        )
        if product is not None:
            mover_stock(
                db,
                product,
                item.quantity,
                StockReason.CANCELACION,
                actor=actor,
                order_id=order.id,
                note=f"Cancelación del pedido #{order.id}",
            )


# ---------------------------------------------------------------------------
# User endpoints
# ---------------------------------------------------------------------------

@router.get("/me", response_model=OrderList)
def my_orders(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> OrderList:
    """Devuelve los pedidos del usuario autenticado."""
    base = select(Order).where(Order.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    # selectinload evita N+1: sin esto, serializar `OrderRead.items` para
    # cada pedido de la página dispara una query extra por pedido (hasta
    # 101 queries con limit=100). Con selectinload son 2 queries totales
    # sin importar cuántos pedidos haya en la página.
    rows = db.scalars(
        base.options(selectinload(Order.items)).order_by(Order.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return OrderList(items=list(rows), total=total)


@router.get("/me/{order_id}", response_model=OrderRead)
def my_order_detail(order_id: int, current_user: CurrentUser, db: DbSession) -> Order:
    """Detalle de un pedido propio."""
    order = _get_order_or_404(order_id, db)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return order


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, current_user: CurrentUser, db: DbSession, request: Request) -> Order:
    """Crea un nuevo pedido con los ítems indicados, validando y descontando stock."""
    ip = audit.client_ip(request)
    locked_for = _order_limiter.check(ip, current_user.email)
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados pedidos. Reintentá en {int(locked_for)} segundos.",
        )

    # Consolidar cantidades por producto (dos ítems del mismo producto suman)
    quantities: dict[int, int] = {}
    for item_in in payload.items:
        quantities[item_in.product_id] = quantities.get(item_in.product_id, 0) + item_in.quantity

    order = Order(user_id=current_user.id, notes=payload.notes, payment_method=payload.payment_method)
    db.add(order)
    db.flush()  # Obtener order.id antes de agregar items

    for product_id, quantity in quantities.items():
        # FOR UPDATE serializa pedidos concurrentes sobre el mismo producto:
        # sin el lock, dos requests podrían pasar la validación con el mismo
        # stock y dejarlo negativo.
        product = db.scalar(
            select(Product).where(Product.id == product_id).with_for_update()
        )
        if product is None or product.is_deleted or not product.is_active:
            # Mensaje con el nombre cuando lo tenemos: este caso se dispara
            # sobre todo cuando alguien tenía el producto en el carrito y el
            # admin lo sacó del catálogo mientras tanto. "Producto 42 no
            # encontrado" no le dice nada al cliente sobre qué sacar.
            nombre = f"'{product.name}'" if product is not None else f"{product_id}"
            raise HTTPException(
                status_code=422,
                detail=f"El producto {nombre} ya no está disponible. Quitalo del carrito para continuar.",
            )
        if product.stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuficiente para '{product.name}': disponible {product.stock}, pedido {quantity}",
            )
        mover_stock(
            db,
            product,
            -quantity,
            StockReason.VENTA,
            actor=current_user,
            order_id=order.id,
            note=f"Pedido #{order.id}",
        )
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                sku_snapshot=product.sku,
                name_snapshot=product.name,
                unit_price_snapshot=float(product.price) if product.price is not None else None,
                quantity=quantity,
            )
        )

    # Sin commit propio -- get_db() confirma una sola vez al final del
    # request (ver docstring en core/database.py); acá alcanza con flush
    # para tener order.id y poder hacer refresh. Si algo falla, el rollback
    # del UoW también revierte el descuento de stock.
    db.flush()
    db.refresh(order)
    _order_limiter.register_failure(ip, current_user.email)
    audit.record(db, action="order.create", actor=current_user, entity="order", entity_id=order.id, request=request)
    # Solo al canal de admin: el cliente acaba de crearlo, ya lo sabe.
    events.publicar([events.CANAL_ADMIN], "order.created", order_id=order.id)
    return order


@router.patch("/me/{order_id}/cancel", response_model=OrderRead)
def cancel_my_order(order_id: int, current_user: CurrentUser, db: DbSession, request: Request) -> Order:
    """Cancela un pedido propio si está en estado Pendiente y devuelve el stock."""
    order = _get_order_or_404(order_id, db)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if order.status != OrderStatus.PENDIENTE:
        raise HTTPException(
            status_code=409,
            detail="Solo se pueden cancelar pedidos Pendientes",
        )
    order.status = OrderStatus.CANCELADO
    _restore_stock(order, db, actor=current_user)
    db.flush()
    db.refresh(order)
    audit.record(db, action="order.cancel", actor=current_user, entity="order", entity_id=order.id, request=request)
    # Al admin, que necesita enterarse de que ese pedido ya no va.
    events.publicar([events.CANAL_ADMIN], "order.updated", order_id=order.id)
    return order


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

def _a_schema_admin(order: Order) -> AdminOrderRead:
    """Arma la respuesta de admin agregando los datos del cliente y el total.

    El total sale de los SNAPSHOTS del pedido, nunca del producto actual: un
    pedido de marzo no puede cambiar de monto porque hoy el producto valga
    otra cosa.

    Las líneas sin precio (`unit_price_snapshot` en NULL, o sea productos
    "Consultar precio") no suman al total y se cuentan aparte, para que la UI
    pueda mostrar "$ 45.000 + 2 a consultar" en vez de un número que parece
    completo y no lo es.
    """
    total = 0.0
    sin_precio = 0
    for item in order.items:
        if item.unit_price_snapshot is None:
            sin_precio += 1
        else:
            total += float(item.unit_price_snapshot) * item.quantity

    # `order.user` puede ser None: el FK es ON DELETE CASCADE, pero un pedido
    # puede quedar sin usuario cargado en escenarios de test o si la relación
    # no se pudo resolver. Se degrada a None en vez de romper la lista entera.
    usuario = order.user
    return AdminOrderRead(
        **OrderRead.model_validate(order).model_dump(),
        customer_name=usuario.full_name if usuario else None,
        customer_email=usuario.email if usuario else None,
        customer_phone=usuario.phone if usuario else None,
        total=round(total, 2),
        items_sin_precio=sin_precio,
    )


@router.get("", response_model=AdminOrderList)
def admin_list_orders(
    _admin: AdminUser,
    db: DbSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: int | None = Query(None),
    order_status: OrderStatus | None = Query(None, alias="status"),
    payment_status: PaymentStatus | None = Query(None),
    q: str | None = Query(None, max_length=120),
) -> AdminOrderList:
    """Todos los pedidos (admin), filtrables por estado, cobro y cliente."""
    base = select(Order)
    if user_id is not None:
        base = base.where(Order.user_id == user_id)
    if order_status is not None:
        base = base.where(Order.status == order_status)
    if payment_status is not None:
        base = base.where(Order.payment_status == payment_status)

    if q:
        termino = q.strip()
        if termino:
            # Buscar por nombre o mail obliga al JOIN con users. Y si el
            # término es un número, lo más probable es que el admin esté
            # tipeando el número de pedido que le pasaron por WhatsApp, así
            # que se busca también por id -- sin excluir la búsqueda por
            # texto, porque un cliente podría llamarse "1234" en teoría y
            # perder el resultado sería peor que traer uno de más.
            condiciones = [
                User.full_name.ilike(f"%{termino}%"),
                User.email.ilike(f"%{termino}%"),
            ]
            if termino.isdigit():
                condiciones.append(Order.id == int(termino))
            base = base.join(User, Order.user_id == User.id).where(or_(*condiciones))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.options(
            selectinload(Order.items),
            # Sin esto, listar 20 pedidos son 21 consultas: una por la lista y
            # una por el usuario de cada fila, al leer customer_name.
            selectinload(Order.user),
        )
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()
    return AdminOrderList(items=[_a_schema_admin(o) for o in rows], total=total)


@router.patch("/{order_id}", response_model=AdminOrderRead)
def admin_update_order(
    order_id: int,
    payload: OrderStatusUpdate,
    admin: AdminUser,
    db: DbSession,
    request: Request,
) -> AdminOrderRead:
    """Actualiza estado de entrega, estado de cobro y notas admin de un pedido.

    Reglas de stock:
      - Transicionar A Cancelado desde otro estado devuelve el stock.
      - Salir DE Cancelado está bloqueado (el stock ya se devolvió; re-descontar
        podría dejarlo inconsistente). Si hace falta, se crea un pedido nuevo.

    El estado de cobro NO participa de ninguna de esas reglas. Cancelar un
    pedido pagado devuelve el stock y deja el cobro en Pagado, que es la
    verdad: la plata está y hay que devolverla por fuera del sistema. Ponerlo
    automáticamente en "Sin cobrar" borraría el rastro de que ese cliente pagó,
    que es justo el dato que hace falta para devolvérsela.
    """
    order = _get_order_or_404(order_id, db)
    previous_status = order.status
    previous_payment = order.payment_status

    if previous_status == OrderStatus.CANCELADO and payload.status != OrderStatus.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede reactivar un pedido cancelado — creá un pedido nuevo.",
        )

    order.status = payload.status
    # Solo si viene: un PATCH que manda únicamente `status` no tiene que pisar
    # el cobro. Por eso el campo es opcional en el schema y no tiene default.
    if payload.payment_status is not None:
        order.payment_status = payload.payment_status
    if payload.admin_notes is not None:
        order.admin_notes = payload.admin_notes
    if payload.status == OrderStatus.CANCELADO and previous_status != OrderStatus.CANCELADO:
        _restore_stock(order, db, actor=admin)
    db.flush()
    db.refresh(order)

    # El detalle de auditoría solo menciona los ejes que efectivamente
    # cambiaron. Registrar siempre los dos llenaría el historial de "Pagado →
    # Pagado" y volvería inútil la pantalla de auditoría para encontrar cuándo
    # se cobró un pedido, que es la consulta para la que sirve.
    cambios = []
    if previous_status != order.status:
        cambios.append(f"{previous_status.value} → {order.status.value}")
    if previous_payment != order.payment_status:
        cambios.append(f"cobro: {previous_payment.value} → {order.payment_status.value}")
    audit.record(
        db,
        action="order.admin_update",
        actor=admin,
        entity="order",
        entity_id=order.id,
        detail=" | ".join(cambios) if cambios else "sin cambios de estado",
        request=request,
    )
    # A los dos lados: al panel, por si hay otro admin con la lista abierta, y
    # al dueño del pedido, que ve moverse el estado en "Mis pedidos" sin
    # recargar. Es el evento que justifica el alcance "admin y clientes".
    events.publicar(
        [events.CANAL_ADMIN, events.canal_usuario(order.user_id)],
        "order.updated",
        order_id=order.id,
    )
    # Devuelve la forma de admin (con cliente y total) y no `OrderRead`: es la
    # respuesta que la lista del panel necesita para actualizar la fila sin
    # tener que volver a pedir la página entera.
    return _a_schema_admin(order)
