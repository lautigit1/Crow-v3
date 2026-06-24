from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchema = TypeVar("CreateSchema", bound=BaseModel)
UpdateSchema = TypeVar("UpdateSchema", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchema, UpdateSchema]):
    """
    Reusable CRUD operations shared by every entity.

    Pass soft_delete=True for models that have an `is_deleted` column.
    In that case:
      - delete() sets is_deleted=True instead of removing the row
      - get() / list() / count() automatically exclude deleted records
    """

    def __init__(self, model: type[ModelType], soft_delete: bool = False):
        self.model = model
        self._soft = soft_delete

    def _not_deleted(self):
        """WHERE clause that filters out soft-deleted rows."""
        return self.model.is_deleted.is_(False)  # type: ignore[attr-defined]

    def get(self, db: Session, obj_id: int) -> ModelType | None:
        stmt = select(self.model).where(self.model.id == obj_id)
        if self._soft:
            stmt = stmt.where(self._not_deleted())
        return db.scalar(stmt)

    def list(self, db: Session, skip: int = 0, limit: int = 100) -> list[ModelType]:
        stmt = select(self.model)
        if self._soft:
            stmt = stmt.where(self._not_deleted())
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    def count(self, db: Session) -> int:
        stmt = select(func.count()).select_from(self.model)
        if self._soft:
            stmt = stmt.where(self._not_deleted())
        return db.scalar(stmt) or 0

    def create(self, db: Session, data: CreateSchema) -> ModelType:
        obj = self.model(**data.model_dump())
        db.add(obj)
        db.flush()  # assigns PK / defaults without committing (UoW commits later)
        db.refresh(obj)
        return obj

    def update(self, db: Session, obj: ModelType, data: UpdateSchema) -> ModelType:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        db.add(obj)
        db.flush()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, obj: ModelType) -> None:
        if self._soft:
            obj.is_deleted = True  # type: ignore[attr-defined]
            db.add(obj)
            db.flush()
        else:
            db.delete(obj)
            db.flush()
