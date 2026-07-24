from collections.abc import Callable
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Response
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.models.brand import Brand
from app.models.category import Category
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.quote import Quote, QuoteStatus
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.dashboard import Analytics, DashboardStats, NamedCount, StockSummary, TrendPoint, Trends

router = APIRouter()

LOW_STOCK_THRESHOLD = 5
_CACHE_TTL = 60  # seconds

Period = Literal["7d", "30d", "90d", "12m"]
_TREND_PERIODS: tuple[Period, ...] = ("7d", "30d", "90d", "12m")

# ── Redis cache helpers ────────────────────────────────────────────────────────

def _cache_get(key: str) -> str | None:
    from app.core.redis_client import get_redis
    r = get_redis()
    if r is None:
        return None
    try:
        return r.get(f"crow:cache:{key}")
    except Exception:
        return None


def _cache_set(key: str, value: str, ttl: int = _CACHE_TTL) -> None:
    from app.core.redis_client import get_redis
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(f"crow:cache:{key}", ttl, value)
    except Exception:
        pass


def invalidate_dashboard_cache() -> None:
    """Borra el cache de `/dashboard` y `/dashboard/analytics`.

    Sin esto, crear/editar/eliminar un producto (o tocar su stock desde
    Inventario) no se reflejaba en el dashboard hasta que expiraran los
    60s de TTL -- el conteo de productos y el "valor de inventario" que
    se ven ahí quedaban desactualizados. Llamado desde cada endpoint de
    `routes/products.py` que cambia el set de productos activos o su
    stock/precio.
    """
    from app.core.redis_client import get_redis
    r = get_redis()
    if r is None:
        return
    try:
        keys = ["crow:cache:dashboard", "crow:cache:analytics"]
        keys += [f"crow:cache:trends:{p}" for p in _TREND_PERIODS]
        r.delete(*keys)
    except Exception:
        pass


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=DashboardStats)
def get_dashboard(db: DbSession, _: AdminUser, response: Response) -> DashboardStats:
    response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=30"

    cached = _cache_get("dashboard")
    if cached:
        return DashboardStats.model_validate_json(cached)

    _active = Product.is_deleted.is_(False)
    total_products = db.scalar(select(func.count()).select_from(Product).where(_active)) or 0
    out_of_stock = db.scalar(select(func.count()).select_from(Product).where(_active, Product.stock <= 0)) or 0
    pending_quotes = db.scalar(
        select(func.count()).select_from(Quote).where(Quote.status.in_([QuoteStatus.NUEVA, QuoteStatus.EN_REVISION]))
    ) or 0
    registered_users = db.scalar(select(func.count()).select_from(User)) or 0
    total_categories = db.scalar(select(func.count()).select_from(Category)) or 0
    total_brands = db.scalar(select(func.count()).select_from(Brand)) or 0
    total_suppliers = db.scalar(select(func.count()).select_from(Supplier)) or 0
    active_suppliers = db.scalar(select(func.count()).select_from(Supplier).where(Supplier.is_active.is_(True))) or 0
    recent_quotes = list(db.scalars(select(Quote).order_by(Quote.created_at.desc()).limit(8)).all())

    result = DashboardStats(
        total_products=total_products,
        out_of_stock=out_of_stock,
        pending_quotes=pending_quotes,
        registered_users=registered_users,
        total_categories=total_categories,
        total_brands=total_brands,
        total_suppliers=total_suppliers,
        active_suppliers=active_suppliers,
        recent_quotes=recent_quotes,
    )
    _cache_set("dashboard", result.model_dump_json())
    return result


@router.get("/analytics", response_model=Analytics)
def get_analytics(db: DbSession, _: AdminUser, response: Response) -> Analytics:
    response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=30"

    cached = _cache_get("analytics")
    if cached:
        return Analytics.model_validate_json(cached)

    _active = Product.is_deleted.is_(False)

    cat_rows = db.execute(
        select(Category.name, func.count(Product.id))
        .join(Product, (Product.category_id == Category.id) & _active, isouter=True)
        .group_by(Category.name)
        .order_by(func.count(Product.id).desc())
    ).all()
    products_by_category = [NamedCount(label=name, value=count) for name, count in cat_rows]

    sup_rows = db.execute(
        select(Supplier.name, func.count(Product.id))
        .join(Product, (Product.supplier_id == Supplier.id) & _active, isouter=True)
        .group_by(Supplier.name)
        .order_by(func.count(Product.id).desc())
        .limit(10)
    ).all()
    products_by_supplier = [NamedCount(label=name, value=count) for name, count in sup_rows]

    status_rows = db.execute(select(Quote.status, func.count(Quote.id)).group_by(Quote.status)).all()
    quotes_by_status = [NamedCount(label=st.value, value=count) for st, count in status_rows]

    veh_rows = db.execute(
        select(Product.vehicle_type, func.count(Product.id))
        .where(_active)
        .group_by(Product.vehicle_type)
        .order_by(func.count(Product.id).desc())
    ).all()
    products_by_vehicle = [NamedCount(label=vt, value=count) for vt, count in veh_rows]

    out_of_stock = db.scalar(select(func.count()).select_from(Product).where(_active, Product.stock <= 0)) or 0
    low_stock = db.scalar(
        select(func.count()).select_from(Product).where(_active, Product.stock > 0, Product.stock <= LOW_STOCK_THRESHOLD)
    ) or 0
    in_stock = db.scalar(select(func.count()).select_from(Product).where(_active, Product.stock > LOW_STOCK_THRESHOLD)) or 0
    inventory_value = db.scalar(
        select(func.coalesce(func.sum(Product.price * Product.stock), 0)).select_from(Product).where(_active)
    ) or 0

    result = Analytics(
        products_by_category=products_by_category,
        products_by_supplier=products_by_supplier,
        quotes_by_status=quotes_by_status,
        products_by_vehicle=products_by_vehicle,
        stock_summary=StockSummary(in_stock=in_stock, low_stock=low_stock, out_of_stock=out_of_stock),
        inventory_value=float(inventory_value),
    )
    _cache_set("analytics", result.model_dump_json())
    return result


# ── Trends (series temporales) ─────────────────────────────────────────────────
# El bucketing se hace en Python a propósito: `date_trunc` es solo de Postgres y
# `strftime` solo de SQLite (que usan los tests). Fetch + agrupación en memoria
# funciona igual en ambos y, al volumen de una PyME, el costo es despreciable.

def _bucket_plan(period: Period) -> tuple[list[date], str, Callable[[date], date]]:
    """Devuelve (buckets ordenados, granularidad, fn que mapea una fecha a su bucket)."""
    today = datetime.utcnow().date()
    if period == "7d":
        start = today - timedelta(days=6)
        return [start + timedelta(days=i) for i in range(7)], "day", lambda d: d
    if period == "30d":
        start = today - timedelta(days=29)
        return [start + timedelta(days=i) for i in range(30)], "day", lambda d: d
    if period == "90d":
        this_monday = today - timedelta(days=today.weekday())
        start_monday = this_monday - timedelta(weeks=12)
        return (
            [start_monday + timedelta(weeks=i) for i in range(13)],
            "week",
            lambda d: d - timedelta(days=d.weekday()),
        )
    # "12m" — mensual
    keys: list[date] = []
    for i in range(11, -1, -1):
        mm, yy = today.month - i, today.year
        while mm <= 0:
            mm += 12
            yy -= 1
        keys.append(date(yy, mm, 1))
    return keys, "month", lambda d: date(d.year, d.month, 1)


def _as_date(dt: datetime | date) -> date:
    return dt.date() if isinstance(dt, datetime) else dt


@router.get("/trends", response_model=Trends)
def get_trends(db: DbSession, _: AdminUser, response: Response, period: Period = "30d") -> Trends:
    response.headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=30"

    cached = _cache_get(f"trends:{period}")
    if cached:
        return Trends.model_validate_json(cached)

    buckets, granularity, bucket_of = _bucket_plan(period)
    index = {b: i for i, b in enumerate(buckets)}
    revenue = [0.0] * len(buckets)
    orders = [0] * len(buckets)
    quotes = [0] * len(buckets)
    cutoff = datetime.combine(buckets[0], datetime.min.time())

    # Ingresos + pedidos: un total por pedido (suma de sus ítems). Los pedidos
    # CANCELADO cuentan como pedido creado pero no como ingreso.
    order_rows = db.execute(
        select(
            Order.created_at,
            Order.status,
            func.coalesce(func.sum(OrderItem.unit_price_snapshot * OrderItem.quantity), 0),
        )
        .join(OrderItem, OrderItem.order_id == Order.id, isouter=True)
        .where(Order.created_at >= cutoff)
        .group_by(Order.id)
    ).all()
    for created_at, status, order_total in order_rows:
        b = bucket_of(_as_date(created_at))
        i = index.get(b)
        if i is None:
            continue
        orders[i] += 1
        if status != OrderStatus.CANCELADO:
            revenue[i] += float(order_total or 0)

    quote_rows = db.execute(select(Quote.created_at).where(Quote.created_at >= cutoff)).all()
    for (created_at,) in quote_rows:
        b = bucket_of(_as_date(created_at))
        i = index.get(b)
        if i is not None:
            quotes[i] += 1

    points = [
        TrendPoint(date=buckets[i].isoformat(), revenue=round(revenue[i], 2), orders=orders[i], quotes=quotes[i])
        for i in range(len(buckets))
    ]
    result = Trends(period=period, granularity=granularity, points=points)
    _cache_set(f"trends:{period}", result.model_dump_json())
    return result
