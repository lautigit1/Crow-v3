from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)


class UserAdminUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    role: UserRole | None = None
    is_active: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PaginatedUsers(BaseModel):
    items: list[UserRead]
    total: int
