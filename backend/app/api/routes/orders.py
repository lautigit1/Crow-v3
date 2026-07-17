from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.deps import AdminUser, CurrentUser, DbSession
from app.core.ratelimit import LoginRateLimiter
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderList, OrderRead, OrderStatusUpdate

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


def _restore_stock(order: Order, db: DbSession) -> None:
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
            product.stock += item.quantity


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
        if product is None or product.is_deleted:
            raise HTTPException(
                status_code=422,
                detail=f"Producto {product_id} no encontrado o inactivo",
            )
        if product.stock < quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuficiente para '{product.name}': disponible {product.stock}, pedido {quantity}",
            )
        product.stock -= quantity
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
    _restore_stock(order, db)
    db.flush()
    db.refresh(order)
    audit.record(db, action="order.cancel", actor=current_user, entity="order", entity_id=order.id, request=request)
    return order


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=OrderList)
def admin_list_orders(
    _admin: AdminUser,
    db: DbSession,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: int | None = Query(None),
) -> OrderList:
    """Todos los pedidos (admin)."""
    base = select(Order)
    if user_id is not None:
        base = base.where(Order.user_id == user_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.options(selectinload(Order.items)).order_by(Order.created_at.desc()).offset(skip).limit(limit)
    ).all()
    return OrderList(items=list(rows), total=total)


@router.patch("/{order_id}", response_model=OrderRead)
def admin_update_order(
    order_id: int,
    payload: OrderStatusUpdate,
    admin: AdminUser,
    db: DbSession,
    request: Request,
) -> Order:
    """Actualiza estado y notas admin de un pedido.

    Reglas de stock:
      - Transicionar A Cancelado desde otro estado devuelve el stock.
      - Salir DE Cancelado está bloqueado (el stock ya se devolvió; re-descontar
        podría dejarlo inconsistente). Si hace falta, se crea un pedido nuevo.
    """
    order = _get_order_or_404(order_id, db)
    previous_status = order.status

    if previous_status == OrderStatus.CANCELADO and payload.status != OrderStatus.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede reactivar un pedido cancelado — creá un pedido nuevo.",
        )

    order.status = payload.status
    if payload.admin_notes is not None:
        order.admin_notes = payload.admin_notes
    if payload.status == OrderStatus.CANCELADO and previous_status != OrderStatus.CANCELADO:
        _restore_stock(order, db)
    db.flush()
    db.refresh(order)
    audit.record(
        db,
        action="order.admin_update",
        actor=admin,
        entity="order",
        entity_id=order.id,
        detail=f"{previous_status.value} → {payload.status.value}",
        request=request,
    )
    return order
