from pydantic import BaseModel, EmailStr, Field

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
    # Mismos límites que UserBase (schemas/user.py) -- sin esto, Pydantic
    # aceptaba un full_name/phone de tamaño arbitrario, que recién fallaba
    # en el INSERT contra VARCHAR(120)/VARCHAR(40) de Postgres con un 503
    # ("error de base de datos") en vez de un 422 de validación, y permitía
    # parsear payloads de varios MB antes de rechazarlos.
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str
    phone: str | None = Field(default=None, max_length=40)
