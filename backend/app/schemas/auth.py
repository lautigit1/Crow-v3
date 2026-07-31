from pydantic import BaseModel, EmailStr, Field, field_validator

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
    # Obligatorio desde el change de notificaciones: sin teléfono, el botón de
    # WhatsApp del panel no tiene a dónde ir, y WhatsApp es el canal por el que
    # se coordina el pago y la entrega de todos los pedidos.
    #
    # El lugar importa: se pide acá y NO en el checkout. En el registro la
    # persona ya está completando un formulario y un campo más es marginal; en
    # el checkout sería fricción justo antes de confirmar la compra.
    #
    # `User.phone` sigue siendo nullable en la base a propósito -- los usuarios
    # que ya existen no tienen teléfono y no hay de dónde sacarlo. Lo obligatorio
    # es el alta, no el modelo, y por eso el panel conserva su fallback a mail.
    phone: str = Field(min_length=1, max_length=40)

    @field_validator("phone")
    @classmethod
    def phone_parece_un_telefono(cls, v: str) -> str:
        """Validación deliberadamente permisiva.

        Solo se exige que haya al menos 8 dígitos. La gente escribe su número de
        mil formas -- "261 660-0569", "+54 9 261 660 0569", "(261) 4660569" -- y
        **rechazar un número válido es peor que aceptar uno raro**: el que no
        puede registrarse se va, y el número mal escrito se corrige hablando.

        No se normaliza el formato guardado: se guarda tal cual lo escribió la
        persona, que es como lo va a reconocer si lo ve. La normalización a
        dígitos ocurre recién al armar el link de WhatsApp (`waLinkCliente`).
        """
        digitos = sum(c.isdigit() for c in v)
        if digitos < 8:
            raise ValueError("Ingresá un teléfono válido (al menos 8 dígitos)")
        return v.strip()
