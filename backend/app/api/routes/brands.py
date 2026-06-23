from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.crud import crud
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandRead, BrandUpdate


class BrandList(BaseModel):
    items: list[BrandRead]
    total: int


router = APIRouter()


@router.get("", response_model=BrandList)
def list_brands(
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> BrandList:
    total = db.scalar(select(func.count()).select_from(Brand)) or 0
    items = list(db.scalars(select(Brand).order_by(Brand.name).offset(skip).limit(limit)).all())
    return BrandList(items=items, total=total)


@router.get("/{brand_id}", response_model=BrandRead)
def get_brand(brand_id: int, db: DbSession) -> Brand:
    obj = crud.brand.get(db, brand_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")
    return obj


@router.post("", response_model=BrandRead, status_code=status.HTTP_201_CREATED)
def create_brand(data: BrandCreate, db: DbSession, admin: AdminUser, request: Request) -> Brand:
    obj = crud.brand.create(db, data)
    audit.record(db, action="brand.create", actor=admin, entity="brand", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.patch("/{brand_id}", response_model=BrandRead)
def update_brand(brand_id: int, data: BrandUpdate, db: DbSession, admin: AdminUser, request: Request) -> Brand:
    obj = crud.brand.get(db, brand_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")
    obj = crud.brand.update(db, obj, data)
    audit.record(db, action="brand.update", actor=admin, entity="brand", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(brand_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    obj = crud.brand.get(db, brand_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marca no encontrada")
    audit.record(db, action="brand.delete", actor=admin, entity="brand", entity_id=obj.id, detail=obj.name, request=request)
    crud.brand.delete(db, obj)
