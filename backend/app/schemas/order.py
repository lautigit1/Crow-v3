from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.order import OrderStatus, PaymentMethod, PaymentStatus

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
    # El estado de cobro SÍ va en el schema compartido: el cliente lo ve en
    # "Mis pedidos" y le evita tener que preguntar si su pago ya figura.
    payment_status: PaymentStatus
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


class AdminOrderRead(OrderRead):
    """Lo que necesita la lista del panel, que `OrderRead` no trae.

    Va aparte y no engordando el schema compartido: `GET /orders/me` no tiene
    por qué devolverle al cliente su propio nombre y teléfono -- ya los sabe --
    y cada campo de más en una respuesta es superficie que después hay que
    mantener.
    """

    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None

    # `total` es la suma de las líneas CON precio. `items_sin_precio` cuenta
    # las que quedaron afuera, que son los productos "Consultar precio"
    # (`Product.price` es nullable, así que `unit_price_snapshot` también).
    #
    # Los dos campos van juntos a propósito: un total que omite líneas en
    # silencio es peor que no mostrar total, porque el admin lee un número que
    # parece completo y no lo es.
    total: float = 0.0
    items_sin_precio: int = 0


class AdminOrderList(BaseModel):
    items: list[AdminOrderRead]
    total: int


class OrderStatusUpdate(BaseModel):
    """Payload del PATCH de admin.

    `status` sigue siendo obligatorio para no romper a quien ya llama a este
    endpoint. `payment_status` es opcional y solo se aplica si viene: mandar
    únicamente el estado de entrega tiene que seguir funcionando exactamente
    igual que antes de este cambio, sin pisar el cobro con un default.
    """

    status: OrderStatus
    payment_status: PaymentStatus | None = None
    admin_notes: str | None = None
