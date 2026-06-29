from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.crud import crud
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductList, ProductRead, ProductUpdate

router = APIRouter()

# Reusable loader option -- avoids N+1 by loading category + brand in 2 extra
# SELECT ... IN (...) queries regardless of result set size.
_EAGER = [selectinload(Product.category), selectinload(Product.brand), selectinload(Product.supplier)]


@router.get("", response_model=ProductList)
def list_products(
    db: DbSession,
    response: Response,
    q: str | None = Query(default=None, description="Busqueda por nombre, SKU o descripcion"),
    category_id: int | None = Query(default=None),
    brand_id: int | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    in_stock: bool | None = Query(default=None),
    featured: bool | None = Query(default=None),
    sort: str = Query(default="recent", pattern="^(recent|name|price_asc|price_desc|stock_asc|stock_desc)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> ProductList:
    # Short public cache -- CDN caches each unique query string separately.
    # 60s is aggressive enough to handle traffic spikes without showing stale stock.
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=30"

    stmt = select(Product).options(*_EAGER).where(Product.is_deleted.is_(False))

    if q:
        q_clean = q.strip()
        like_filters = [
            func.lower(Product.name).contains(q_clean.lower()),
            func.lower(Product.sku).contains(q_clean.lower()),
            func.lower(func.coalesce(Product.description, "")).contains(q_clean.lower()),
        ]
        # pg_trgm similarity -- Postgres only (GIN index from migration 003)
        try:
            is_pg = db.get_bind().dialect.name == "postgresql"
        except Exception:
            is_pg = False
        if is_pg:
            trgm_filters = [Product.name.op("%%")(q_clean), Product.sku.op("%%")(q_clean)]
            stmt = stmt.where(or_(*trgm_filters, *like_filters))
        else:
            stmt = stmt.where(or_(*like_filters))
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if brand_id is not None:
        stmt = stmt.where(Product.brand_id == brand_id)
    if vehicle_type and vehicle_type not in ("Todos", "Universal"):
        stmt = stmt.where(Product.vehicle_type.in_([vehicle_type, "Universal"]))
    if in_stock:
        stmt = stmt.where(Product.stock > 0)
    if featured:
        stmt = stmt.where(Product.is_featured.is_(True))

    order_map = {
        "recent":     Product.created_at.desc(),
        "name":       Product.name.asc(),
        "price_asc":  Product.price.asc().nullslast(),
        "price_desc": Product.price.desc().nullslast(),
        "stock_asc":  Product.stock.asc(),
        "stock_desc": Product.stock.desc(),
    }
    order_by = order_map.get(sort, Product.created_at.desc())

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    items = list(db.scalars(stmt.order_by(order_by).offset(skip).limit(limit)).all())
    return ProductList(items=items, total=total)


@router.get("/deleted", response_model=ProductList)
def list_deleted_products(
    db: DbSession,
    _: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> ProductList:
    """Lista productos eliminados (soft delete). Solo admin."""
    stmt = (
        select(Product)
        .options(*_EAGER)
        .where(Product.is_deleted.is_(True))
        .order_by(Product.deleted_at.desc().nullslast())
    )
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return ProductList(items=items, total=total)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession, response: Response) -> Product:
    response.headers["Cache-Control"] = "public, max-age=120, stale-while-revalidate=60"
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == product_id, Product.is_deleted.is_(False)))
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return obj


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DbSession, admin: AdminUser, request: Request) -> Product:
    obj = crud.product.create(db, data)
    db.refresh(obj)
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == obj.id))
    audit.record(db, action="product.create", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, data: ProductUpdate, db: DbSession, admin: AdminUser, request: Request) -> Product:
    obj = crud.product.get(db, product_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    obj = crud.product.update(db, obj, data)
    ob