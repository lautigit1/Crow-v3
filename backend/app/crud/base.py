from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchema = TypeVar("CreateSchema", bound=BaseModel)
UpdateSchema = TypeVar("UpdateSchema", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchema, UpdateSchema]):
    """Reusable CRUD operations shared by every entity."""

    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, db: Session, obj_id: int) -> ModelType | None:
        return db.get(self.model, obj_id)

    def list(self, db: Session, skip: int = 0, limit: int = 100) -> list[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    def count(self, db: Session) -> int:
        return db.scalar(select(func.count()).select_from(self.model)) or 0

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
        db.delete(obj)
        db.flush()
