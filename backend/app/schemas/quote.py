from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.quote import QuoteStatus


class QuoteBase(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    customer_email: EmailStr | None = None
    customer_phone: str | None = Field(default=None, max_length=40)
    vehicle: str | None = Field(default=None, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    product_id: int | None = None


class QuoteCreate(QuoteBase):
    pass


class QuoteStatusUpdate(BaseModel):
    status: QuoteStatus


class QuoteRead(QuoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: QuoteStatus
    user_id: int | None = None
    created_at: datetime


class QuoteList(BaseModel):
    """Paginated list for admin endpoints."""
    items: list[QuoteRead]
    total: int
