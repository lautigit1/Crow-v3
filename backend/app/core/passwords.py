import re

from fastapi import HTTPException, status

_MIN_LENGTH = 10
_MAX_LENGTH = 128

# Reject the most common/terrible passwords outright
_COMMON = frozenset({
    "password", "password1", "password12", "password123",
    "12345678", "123456789", "1234567890", "qwerty123",
    "iloveyou", "admin123", "letmein1", "welcome1",
    "monkey123", "dragon123", "master123", "passw0rd",
    "abc12345", "superman1", "batman123",
})


def validate_password_strength(password: str) -> None:
    """
    Raises HTTP 422 if the password does not meet the security policy:
      • 10–128 characters
      • At least one uppercase letter
      • At least one lowercase letter
      • At least one digit
      • At least one special character  (!@#$%^&*…)
      • Not in the common-passwords blocklist
    """
    problems: list[str] = []

    if len(password) < _MIN_LENGTH:
        problems.append(f"al menos {_MIN_LENGTH} caracteres")
    if len(password) > _MAX_LENGTH:
        problems.append(f"máximo {_MAX_LENGTH} caracteres")
    if not re.search(r"[A-Z]", password):
        problems.append("una letra mayúscula")
    if not re.search(r"[a-z]", password):
        problems.append("una letra minúscula")
    if not re.search(r"\d", password):
        problems.append("un número")
    if not re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>?/\\|`~]', password):
        problems.append("un carácter especial (!@#$%^&*…)")
    if password.lower() in _COMMON:
        problems.append("no puede ser una contraseña común")

    if problems:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener: " + ", ".join(problems) + ".",
        )
