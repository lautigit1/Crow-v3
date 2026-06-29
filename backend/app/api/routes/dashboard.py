from fastapi import APIRouter, Response
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.quote import Quote, QuoteStatus
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.dashboard import Analytics, DashboardStats, NamedCount, StockSummary

router = APIRouter()

LOW_STOCK_THRESHOLD = 5
_CACHE_TTL = 60  # seconds

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
