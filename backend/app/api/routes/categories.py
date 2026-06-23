from fastapi import APIRouter, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.crud import crud
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate


class CategoryList(BaseModel):
    items: list[CategoryRead]
    total: int


router = APIRouter()


@router.get("", response_model=CategoryList)
def list_categories(
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> CategoryList:
    total = db.scalar(select(func.count()).select_from(Category)) or 0
    items = list(db.scalars(select(Category).order_by(Category.name).offset(skip).limit(limit)).all())
    return CategoryList(items=items, total=total)


@router.get("/{category_id}", response_model=CategoryRead)
def get_category(category_id: int, db: DbSession) -> Category:
    obj = crud.category.get(db, category_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    return obj


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: DbSession, admin: AdminUser, request: Request) -> Category:
    obj = crud.category.create(db, data)
    audit.record(db, action="category.create", actor=admin, entity="category", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, data: CategoryUpdate, db: DbSession, admin: AdminUser, request: Request) -> Category:
    obj = crud.category.get(db, category_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    obj = crud.category.update(db, obj, data)
    audit.record(db, action="category.update", actor=admin, entity="category", entity_id=obj.id, detail=obj.name, request=request)
    return obj


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: DbSession, admin: AdminUser, request: Request) -> None:
    obj = crud.category.get(db, category_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")
    audit.record(db, action="category.delete", actor=admin, entity="category", entity_id=obj.id, detail=obj.name, request=request)
    crud.category.delete(db, obj)
