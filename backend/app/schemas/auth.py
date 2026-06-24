from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead


class Token(BaseModel):
    """Legacy — kept for internal use only. Tokens are no longer sent in the body."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class AuthResponse(BaseModel):
    """Response returned by login, register, and refresh endpoints.
    Tokens are set as HttpOnly cookies — never exposed in the body."""
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
