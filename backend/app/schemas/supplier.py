from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SupplierBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    contact_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    city: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_count: int = 0
    created_at: datetime
    updated_at: datetime


class SupplierList(BaseModel):
    items: list[SupplierRead]
    total: int
