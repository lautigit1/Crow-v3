from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.order import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("La cantidad debe ser al menos 1")
        return v


class OrderCreate(BaseModel):
    notes: str | None = None
    items: list[OrderItemCreate]

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("El pedido debe tener al menos un ítem")
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
