from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.quote import QuoteStatus


class QuoteBase(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    customer_email: EmailStr | None = None
    customer_phone: str | None = Field(default=None, max_length=40)
    # Sigue siendo opcional ACÁ, y es importante que así quede: `QuoteRead`
    # hereda de esta clase y tiene que poder leer las cotizaciones que ya
    # existen en la base sin vehículo. Volverlo obligatorio en el schema
    # compartido haría que listar el historial reviente con un 500.
    vehicle: str | None = Field(default=None, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    product_id: int | None = None


class QuoteCreate(QuoteBase):
    """Lo que se acepta al CREAR. El vehículo es obligatorio solo acá.

    Mismo razonamiento que el teléfono en el registro: es el dato sin el cual
    no se puede hacer el trabajo -- una pastilla de freno no existe en abstracto,
    existe para un auto -- y pedirlo mientras la persona ya está escribiendo su
    consulta cuesta poco. Sin él, la respuesta arranca con un ida y vuelta por
    WhatsApp para preguntar lo que el formulario podría haber pedido.
    """

    vehicle: str = Field(min_length=1, max_length=160)

    @field_validator("vehicle")
    @classmethod
    def vehiculo_no_vacio(cls, v: str) -> str:
        # `min_length` no alcanza: "   " tiene tres caracteres y pasa.
        if not v.strip():
            raise ValueError("Contanos para qué vehículo es")
        return v.strip()


class QuoteStatusUpdate(BaseModel):
    status: QuoteStatus


# ---------------------------------------------------------------------------
# Opciones cotizadas
# ---------------------------------------------------------------------------

class QuoteOptionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    detail: str | None = Field(default=None, max_length=400)
    unit_price: float = Field(gt=0)
    quantity: int = Field(default=1, ge=1, le=999)
    # Texto libre: "3 a 5 días hábiles", "depende del importador". Un entero de
    # días obligaría a inventar precisión que no se tiene.
    lead_time: str | None = Field(default=None, max_length=60)


class QuoteOptionUpdate(BaseModel):
    """Todo opcional: se edita una celda sin reenviar la fila entera."""

    title: str | None = Field(default=None, min_length=1, max_length=120)
    detail: str | None = Field(default=None, max_length=400)
    unit_price: float | None = Field(default=None, gt=0)
    quantity: int | None = Field(default=None, ge=1, le=999)
    lead_time: str | None = Field(default=None, max_length=60)


class QuoteOptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    detail: str | None
    unit_price: float
    quantity: int
    lead_time: str | None
    created_at: datetime

    @property
    def total(self) -> float:
        return self.unit_price * self.quantity


class QuoteConvertRequest(BaseModel):
    """Cuál de las alternativas cotizadas aceptó el cliente.

    Obligatorio incluso cuando hay una sola opción: el admin está creando un
    pedido con un precio, y "la única que había" no es una elección explícita.
    """

    option_id: int


class QuoteRead(QuoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: QuoteStatus
    user_id: int | None = None
    created_at: datetime
    answered_at: datetime | None = None
    order_id: int | None = None
    # Las opciones viajan siempre con la cotización: son pocas por definición
    # (dos o tres) y quien pide una cotización las quiere ver. Una request
    # aparte para traer dos filas sería trabajo de más.
    options: list[QuoteOptionRead] = []


class QuoteList(BaseModel):
    """Paginated list for admin endpoints."""
    items: list[QuoteRead]
    total: int
