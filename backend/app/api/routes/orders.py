from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate, OrderList, OrderRead, OrderStatusUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_order_or_404(order_id: int, db: DbSession) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


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
    rows = db.scalars(base.order_by(Order.created_at.desc()).offset(skip).limit(limit)).all()
    return OrderList(items=list(rows), total=total)


@router.get("/me/{order_id}", response_model=OrderRead)
def my_order_detail(order_id: int, current_user: CurrentUser, db: DbSession) -> Order:
    """Detalle de un pedido propio."""
    order = _get_order_or_404(order_id, db)
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return order


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, current_user: CurrentUser, db: DbSession) -> Order:
    """Crea un nuevo pedido con los ítems indicados."""
    order = Order(user_id=current_user.id, notes=payload.notes)
    db.add(order)
    db.flush()  # Obtener order.id antes de agregar items

    for item_in in payload.items:
        product = db.get(Product, item_in.product_id)
        if product is None or product.is_deleted:
            raise HTTPException(
                status_code=422,
                detail=f"Producto {item_in.product_id} no encontrado o inactivo",
            )
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                sku_snapshot=product.sku,
                name_snapshot=product.name,
                unit_price_snapshot=float(product.price) if product.price is not None else None,
                quantity=item_in.quantity,
            )
        )

    db.commit()
    db.refresh(order)
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
    rows = db.scalars(base.order_by(Order.created_at.desc()).offset(skip).limit(limit)).all()
    return OrderList(items=list(rows), total=total)


@router.patch("/{order_id}", response_model=OrderRead)
def admin_update_order(
    order_id: int,
    payload: OrderStatusUpdate,
    _admin: AdminUser,
    db: DbSession,
) -> Order:
    """Actualiza estado y notas admin de un pedido."""
    order = _get_order_or_404(order_id, db)
    order.status = payload.status
    if payload.admin_notes is not None:
        order.admin_notes = payload.admin_notes
    db.commit()
    db.refresh(order)
    return order
