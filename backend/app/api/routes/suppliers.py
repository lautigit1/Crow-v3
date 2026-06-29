from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierList, SupplierRead, SupplierUpdate

router = APIRouter()


def _to_read(s: Supplier, db: DbSession) -> SupplierRead:
    count = db.scalar(select(func.count()).select_from(Product).where(Product.supplier_id == s.id)) or 0
    return SupplierRead.model_validate(s, update={"product_count": count})


@router.get("", response_model=SupplierList)
def list_suppliers(
    db: DbSession,
    _: AdminUser,
    q: str | None = Query(default=None),
    active_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> SupplierList:
    stmt = select(Supplier)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Supplier.name).like(like)
            | func.lower(func.coalesce(Supplier.contact_name, "")).like(like)
            | func.lower(func.coalesce(Supplier.city, "")).like(like)
        )
    if active_only:
        stmt = stmt.where(Supplier.is_active.is_(True))

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    suppliers = list(db.scalars(stmt.order_by(Supplier.name).offset(skip).limit(limit)).all())

    # Batch-fetch product counts
    ids = [s.id for s in suppliers]
    counts: dict[int, int] = {}
    if ids:
        rows = db.execute(
            select(Product.supplier_id, func.count(Product.id))
            .where(Product.supplier_id.in_(ids))
            .group_by(Product.supplier_id)
        ).all()
        counts = {sid: cnt for sid, cnt in rows}

    items = [
        SupplierRead.model_validate(s, update={"product_count": counts.get(s.id, 0)})
        for s in suppliers
    ]
    return SupplierList(items=items, total=total)


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(supplier_id: int, db: DbSession, _: AdminUser) -> SupplierRead:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    return _to_read(s, db)


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(data: SupplierCreate, db: DbSession, admin: AdminUser, request: Request) -> SupplierRead:
    s = Supplier(**data.model_dump())
    db.add(s)
    db.flush()
    db.refresh(s)
    audit.record(db, action="supplier.create", actor=admin, entity="supplier", entity_id=s.id, detail=s.name, request=request)
    return _to_read(s, db)


@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(supplier_id: int, data: SupplierUpdate, db: DbSession, admin: AdminUser, request: Request) -> SupplierRead:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(s, field, value)
    db.add(s)
    db.flush()
    db.refresh(s)
    audit.record(db, action="supplier.update", actor=admin, entity="supplier", entity_id=s.id, detail=s.name, request=request)
    return _to_read(s, db)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(supplier_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado")
    audit.record(db, action="supplier.delete", actor=admin, entity="supplier", entity_id=s.id, detail=s.name, request=request)
    db.delete(s)
    db.flush()
