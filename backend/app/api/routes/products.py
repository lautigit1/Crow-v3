from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.routes.dashboard import invalidate_dashboard_cache
from app.core import audit
from app.core.deps import AdminUser, DbSession, OptionalAdmin
from app.core.stock import mover_stock
from app.crud import crud
from app.models.product import Product, producto_publico
from app.models.stock_movement import StockMovement, StockReason
from app.models.user import User
from app.schemas.product import (
    ProductBulkActive,
    ProductBulkResult,
    ProductCreate,
    ProductList,
    ProductRead,
    ProductUpdate,
    StockMovementRead,
)

router = APIRouter()

# Reusable loader option -- avoids N+1 by loading category + brand in 2 extra
# SELECT ... IN (...) queries regardless of result set size.
_EAGER = [selectinload(Product.category), selectinload(Product.brand), selectinload(Product.supplier)]


def _serialize_product(product: Product, admin: User | None) -> ProductRead:
    """Serializa un producto ocultando costo/margen a cualquiera que no
    sea un admin logueado -- sin importar lo que haya en la base."""
    data = ProductRead.model_validate(product)
    if admin is None:
        data.cost_price = None
        data.margin_pct = None
    return data


@router.get("", response_model=ProductList)
def list_products(
    db: DbSession,
    response: Response,
    admin: OptionalAdmin,
    q: str | None = Query(default=None, description="Busqueda por nombre, SKU o descripcion"),
    category_id: int | None = Query(default=None),
    brand_id: int | None = Query(default=None),
    vehicle_type: str | None = Query(default=None),
    in_stock: bool | None = Query(default=None),
    featured: bool | None = Query(default=None),
    supplier_id: int | None = Query(default=None),
    # Solo tiene efecto para un admin logueado: el público nunca ve borradores,
    # así que dejarlo pasar sería una forma de listar lo no publicado.
    is_active: bool | None = Query(default=None),
    sort: str = Query(default="recent", pattern="^(recent|name|price_asc|price_desc|stock_asc|stock_desc)$"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=24, ge=1, le=100),
) -> ProductList:
    # Short public cache -- CDN/browser caches each unique query string
    # separately. 60s es agresivo pero razonable para tráfico anónimo del
    # catálogo. Para el panel de admin esto rompe la consistencia: crear/
    # editar un producto y volver a buscar con el mismo query string (ej.
    # el propio filtro por SKU que usa AdminProductsPage) puede devolver la
    # respuesta cacheada por el browser con datos viejos -- el admin
    # necesita ver siempre el estado real, así que ahí no cacheamos nada.
    response.headers["Cache-Control"] = (
        "no-store" if admin else "public, max-age=60, stale-while-revalidate=30"
    )

    # Un admin logueado ve también los borradores (los necesita para
    # completarlos y publicarlos); cualquier otro caller ve solo lo público.
    stmt = select(Product).options(*_EAGER)
    if admin:
        stmt = stmt.where(Product.is_deleted.is_(False))
        if is_active is not None:
            stmt = stmt.where(Product.is_active.is_(is_active))
    else:
        stmt = stmt.where(producto_publico())

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
            trgm_filters = [Product.name.op("%")(q_clean), Product.sku.op("%")(q_clean)]
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
    if supplier_id is not None:
        stmt = stmt.where(Product.supplier_id == supplier_id)

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
    return ProductList(items=[_serialize_product(p, admin) for p in items], total=total)


@router.get("/deleted", response_model=ProductList)
def list_deleted_products(
    db: DbSession,
    admin: AdminUser,
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
    return ProductList(items=[_serialize_product(p, admin) for p in items], total=total)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession, response: Response, admin: OptionalAdmin) -> ProductRead:
    response.headers["Cache-Control"] = (
        "no-store" if admin else "public, max-age=120, stale-while-revalidate=60"
    )
    # Sin esto, un borrador seguiría accesible por URL directa aunque no
    # aparezca en ningún listado -- que es la forma más común de filtrar algo
    # sin querer (el link se comparte, o queda en el historial de alguien).
    visible = Product.is_deleted.is_(False) if admin else producto_publico()
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == product_id, visible))
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return _serialize_product(obj, admin)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, db: DbSession, admin: AdminUser, request: Request) -> ProductRead:
    obj = crud.product.create(db, data)
    db.refresh(obj)
    # El stock inicial también es un movimiento: si no, el primer producto
    # cargado con 20 unidades arrancaría con un historial que no explica de
    # dónde salieron esas 20. `mover_stock` espera el delta, y el producto ya
    # se creó con su stock, así que se arranca desde 0.
    if obj.stock:
        inicial = obj.stock
        obj.stock = 0
        mover_stock(db, obj, inicial, StockReason.ALTA, actor=admin, note="Stock inicial")
        db.flush()
    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == obj.id))
    audit.record(db, action="product.create", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    invalidate_dashboard_cache()
    return _serialize_product(obj, admin)


@router.patch("/bulk", response_model=ProductBulkResult)
def bulk_set_active(
    data: ProductBulkActive, db: DbSession, admin: AdminUser, request: Request
) -> ProductBulkResult:
    """Publica o despublica varios productos en una sola operación.

    IMPORTANTE: esta ruta tiene que quedar declarada ANTES de
    `PATCH /{product_id}`. FastAPI resuelve por orden de registro, así que si
    estuviera después, "bulk" se interpretaría como el `product_id` de la otra
    ruta y devolvería 422 en vez de entrar acá. Mismo motivo por el que
    `GET /deleted` está antes que `GET /{product_id}` más arriba.

    Es genérico (recibe ids, no un proveedor) porque lo usan dos pantallas: el
    panel del proveedor manda los ids de sus productos, y la tabla de
    productos manda los que el admin haya seleccionado a mano.
    """
    # Los borrados quedan afuera: republicar algo que está en la papelera
    # tiene que pasar por "restaurar", que es una acción distinta y explícita.
    encontrados = list(db.scalars(
        select(Product).where(Product.id.in_(data.ids), Product.is_deleted.is_(False))
    ).all())

    for producto in encontrados:
        producto.is_active = data.is_active
        db.add(producto)
    db.flush()

    ids_encontrados = {p.id for p in encontrados}
    salteados = [i for i in data.ids if i not in ids_encontrados]

    audit.record(
        db,
        action="product.bulk_active",
        actor=admin,
        entity="product",
        detail=f"{'publicados' if data.is_active else 'despublicados'}: {len(encontrados)}",
        request=request,
    )
    invalidate_dashboard_cache()
    return ProductBulkResult(updated=len(encontrados), skipped=salteados)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(product_id: int, data: ProductUpdate, db: DbSession, admin: AdminUser, request: Request) -> ProductRead:
    obj = crud.product.get(db, product_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    # El stock se saca del payload y se aplica aparte, vía `mover_stock()`:
    # si se dejara pasar por el update genérico, el valor se pisaría sin dejar
    # registro y el historial quedaría con un agujero cada vez que alguien
    # corrige una cantidad desde Inventario.
    #
    # Se reconstruye el schema en vez de usar `model_copy(update={"stock": None})`:
    # `model_copy` marca el campo como seteado, así que `exclude_unset` en
    # `crud.update` lo dejaría pasar igual y escribiría `stock = NULL`, que la
    # columna rechaza. Reconstruir desde `model_dump(exclude_unset=True)` sin
    # esa clave es la única forma de que el campo quede realmente sin setear.
    campos = data.model_dump(exclude_unset=True)
    stock_pedido = campos.pop("stock", None)
    obj = crud.product.update(db, obj, type(data)(**campos))
    if stock_pedido is not None:
        mover_stock(
            db,
            obj,
            stock_pedido - obj.stock,
            StockReason.AJUSTE,
            actor=admin,
            note="Ajuste desde el panel",
        )
        db.flush()

    obj = db.scalar(select(Product).options(*_EAGER).where(Product.id == obj.id))
    audit.record(db, action="product.update", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    invalidate_dashboard_cache()
    return _serialize_product(obj, admin)


@router.get("/{product_id}/stock-movements", response_model=list[StockMovementRead])
def list_stock_movements(
    product_id: int,
    db: DbSession,
    _: AdminUser,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[StockMovement]:
    """Historial de stock de un producto, del más reciente al más viejo.

    Solo admin: expone quién movió qué y cuándo.

    El historial arranca en el deploy de la migración 014 -- los movimientos
    anteriores no existían y no hay forma de reconstruirlos, así que para un
    producto viejo la suma de los deltas no va a dar su stock actual. Por eso
    cada movimiento guarda además `stock_after`.
    """
    return list(db.scalars(
        select(StockMovement)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        .limit(limit)
    ).all())


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    obj = crud.product.get(db, product_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    obj.deleted_at = datetime.now(timezone.utc)
    audit.record(db, action="product.delete", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    crud.product.delete(db, obj)
    invalidate_dashboard_cache()


@router.patch("/{product_id}/restore", response_model=ProductRead)
def restore_product(product_id: int, db: DbSession, admin: AdminUser, request: Request) -> ProductRead:
    """Restaura un producto eliminado (soft delete). Solo admin."""
    obj = db.scalar(
        select(Product).options(*_EAGER).where(Product.id == product_id, Product.is_deleted.is_(True))
    )
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado o no está eliminado",
        )
    obj.is_deleted = False
    obj.deleted_at = None
    db.flush()
    db.refresh(obj)
    audit.record(db, action="product.restore", actor=admin, entity="product", entity_id=obj.id, detail=obj.name, request=request)
    invalidate_dashboard_cache()
    return _serialize_product(obj, admin)
