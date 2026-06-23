from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.crud import crud
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductList, ProductRead, ProductUpdate

router = APIRouter()

# Reusable loader option — avoids N+1 by loading category + brand in 2 extra
# SELECT ... IN (...) queries regardless of result set size.
_EAGER = [selectinload(Product.category), selectinload(Product.brand), selectinload(Product.supplier)]


@router.get("", response_model=ProductList)
def list_products(
    db: DbSession,
    q: str | None = Query(default=None, description="Búsqueda por nombre, SKU o descripción"),
    category_id: int | None = Query(default=None),
    brand_id: int | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    in_stock: bool | None = Query(default=None),
    featured: bool | None = Query(default=None),
    sort: str = Query(default="recent", pattern="^(recent|name|price_asc|price_desc|stock_asc|stock_desc)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> ProductList:
    stmt = select(Product).options(*_EAGER)

    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.name).like(like),
                func.lower(Product.sku).like(like),
                func.lower(func.coalesce(Product.description, "")).like(like),
            )
        )
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

    # Count on the filtered subquery (before ordering/pagination)
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    items = list(db.scalars(stmt.order_by(order_by).offset(skip).limit(limit)).all())
    return ProductList(items=items, total=total)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession) -> Product:
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == product_id))
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return obj


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DbSession, admin: AdminUser, request: Request) -> Product:
    obj = crud.product.create(db, data)
    # Reload with relationships so the response is complete
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
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == obj.id))
    audit.record(db, action="product.update", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    obj = crud.product.get(db, product_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    audit.record(db, action="product.delete", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    crud.product.delete(db, obj)
