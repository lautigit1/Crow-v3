from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.brand import BrandRead
from app.schemas.category import CategoryRead

_SKU_MAX = 40
_NAME_MAX = 160
_DESC_MAX = 4000
_URL_MAX = 500
_VEH_MAX = 40


class _SupplierMin(BaseModel):
    """Minimal supplier info embedded in ProductRead to avoid circular imports."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=_NAME_MAX)
    sku: str = Field(min_length=1, max_length=_SKU_MAX)
    description: str | None = Field(default=None, max_length=_DESC_MAX)
    price: Decimal | None = Field(default=None, ge=0)
    stock: int = Field(default=0, ge=0)
    image_url: str | None = Field(default=None, max_length=_URL_MAX)
    vehicle_type: str = Field(default="Universal", max_length=_VEH_MAX)
    is_featured: bool = False
    category_id: int | None = None
    brand_id: int | None = None
    supplier_id: int | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=_NAME_MAX)
    sku: str | None = Field(default=None, min_length=1, max_length=_SKU_MAX)
    description: str | None = Field(default=None, max_length=_DESC_MAX)
    price: Decimal | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=_URL_MAX)
    vehicle_type: str | None = Field(default=None, max_length=_VEH_MAX)
    is_featured: bool | None = None
    category_id: int | None = None
    brand_id: int | None = None
    supplier_id: int | None = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_deleted: bool
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    category: CategoryRead | None = None
    brand: BrandRead | None = None
    supplier: _SupplierMin | None = None


class ProductList(BaseModel):
    items: list[ProductRead]
    total: int
