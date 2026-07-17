from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.order import OrderStatus, PaymentMethod

MAX_ITEM_QUANTITY = 999
MAX_ORDER_ITEMS = 50


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_in_range(cls, v: int) -> int:
        if v < 1:
            raise ValueError("La cantidad debe ser al menos 1")
        if v > MAX_ITEM_QUANTITY:
            raise ValueError(f"La cantidad máxima por ítem es {MAX_ITEM_QUANTITY}")
        return v


class OrderCreate(BaseModel):
    notes: str | None = None
    payment_method: PaymentMethod | None = None
    items: list[OrderItemCreate]

    @field_validator("items")
    @classmethod
    def items_within_bounds(cls, v: list) -> list:
        if not v:
            raise ValueError("El pedido debe tener al menos un ítem")
        if len(v) > MAX_ORDER_ITEMS:
            raise ValueError(f"El pedido no puede tener más de {MAX_ORDER_ITEMS} ítems")
        return v


class OrderItemRead(BaseModel):
    id: int
    product_id: int | None
    sku_snapshot: str
    name_snapshot: str
    unit_price_snapshot: float | None
    quantity: int

    model_config = {"from_attributes": True}


class OrderRead(BaseModel):
    id: int
    user_id: int
    status: OrderStatus
    notes: str | None
    admin_notes: str | None
    payment_method: PaymentMethod | None
    items: list[OrderItemRead]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderList(BaseModel):
    items: list[OrderRead]
    total: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    admin_notes: str | None = None
