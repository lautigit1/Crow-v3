from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
