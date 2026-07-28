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
    # Default True: crear un producto desde el panel lo publica, que es el
    # comportamiento de siempre. El flujo de importación de facturas lo manda
    # explícitamente en False para que entre como borrador.
    is_active: bool = True
    category_id: int | None = None
    brand_id: int | None = None
    supplier_id: int | None = None


class ProductCreate(ProductBase):
    # Costo/margen -- opcionales, uso interno de admin (ver nota en el modelo).
    cost_price: Decimal | None = Field(default=None, ge=0)
    margin_pct: Decimal | None = Field(default=None, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=_NAME_MAX)
    sku: str | None = Field(default=None, min_length=1, max_length=_SKU_MAX)
    description: str | None = Field(default=None, max_length=_DESC_MAX)
    price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    margin_pct: Decimal | None = Field(default=None, ge=0)
    stock: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=_URL_MAX)
    vehicle_type: str | None = Field(default=None, max_length=_VEH_MAX)
    is_featured: bool | None = None
    is_active: bool | None = None
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
    # Presentes en el schema para que el mismo modelo sirva de respuesta
    # pública y admin -- el valor real solo se completa para admins
    # logueados (ver `_serialize_product` en routes/products.py). Para
    # cualquier otro caller quedan en None sin importar lo que haya en DB.
    cost_price: Decimal | None = None
    margin_pct: Decimal | None = None


class ProductList(BaseModel):
    items: list[ProductRead]
    total: int


class StockMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delta: int
    stock_after: int
    reason: str
    note: str | None = None
    order_id: int | None = None
    created_at: datetime


class ProductBulkActive(BaseModel):
    """Publicar o despublicar varios productos de una."""

    # `max_length` acotado a propósito: el caso de uso real es "todos los
    # productos de un proveedor", que en este negocio son decenas, no miles.
    # Un tope explícito evita que un request accidental bloquee filas de la
    # tabla por varios segundos.
    ids: list[int] = Field(min_length=1, max_length=500)
    is_active: bool


class ProductBulkResult(BaseModel):
    updated: int
    # Ids que se pidieron pero no se tocaron (no existen o están borrados).
    # Se devuelven en vez de fallar: en una acción en lote es más útil saber
    # qué quedó afuera que perder toda la operación por un id viejo.
    skipped: list[int]
