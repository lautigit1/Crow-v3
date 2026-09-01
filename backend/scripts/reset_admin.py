"""
Upsert the admin user with a known password.
Run inside the API container:
    docker exec -it crow_api python scripts/reset_admin.py

La contraseña NO vive en este archivo: sale de SEED_ADMIN_PASSWORD --la misma
variable que usa el seed-- o se pide por teclado. Tenerla hardcodeada acá
significaba que la clave del admin de producción estaba publicada en el repo
para cualquiera que lo clonara, y sin ninguna señal de que era así.
"""
import getpass
import os
import sys

sys.path.insert(0, "/app")

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.passwords import validate_password_strength
from app.core.security import hash_password
from app.models.user import User, UserRole

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@crowrepuestos.com")
ADMIN_NAME = "Administrador"


def _leer_password() -> str:
    """SEED_ADMIN_PASSWORD si está seteada; si no, se pide por teclado.

    El prompt es para el uso normal (`docker exec -it`); la variable, para
    cuando esto corre desde un script sin terminal. Sin ninguna de las dos no
    hay default: es preferible que el reset falle a que deje al admin con una
    contraseña que alguien más también conoce.
    """
    desde_env = os.getenv("SEED_ADMIN_PASSWORD")
    if desde_env:
        return desde_env

    if not sys.stdin.isatty():
        sys.exit(
            "SEED_ADMIN_PASSWORD no está seteada y no hay terminal para pedirla.\n"
            "Corré el script con -it, o pasá la variable:\n"
            "  docker exec -e SEED_ADMIN_PASSWORD=... crow_api python scripts/reset_admin.py"
        )

    password = getpass.getpass(f"Contraseña nueva para {ADMIN_EMAIL}: ")
    if password != getpass.getpass("Repetila: "):
        sys.exit("Las contraseñas no coinciden.")
    return password


def main() -> None:
    password = _leer_password()
    try:
        # Misma política que el registro y el cambio de contraseña: 10+ chars,
        # mayúscula, minúscula, dígito y especial. Se reusa la función de la app
        # en vez de repetir las reglas acá, que es como se desincronizan.
        validate_password_strength(password)
    except HTTPException as exc:
        sys.exit(str(exc.detail))

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if user:
            user.hashed_password = hash_password(password)
            user.role = UserRole.ADMIN
            user.is_active = True
            # Igual que `POST /users/me/password`: sin subir la versión, los
            # tokens emitidos con la contraseña vieja siguen siendo válidos
            # hasta que expiren. Si el reset se hace porque la cuenta se
            # comprometió, dejarlos vivos vacía el sentido del reset.
            user.token_version += 1
            db.commit()
            print(f"✓ Contraseña actualizada para {ADMIN_EMAIL} (sesiones anteriores cerradas)")
        else:
            db.add(User(
                full_name=ADMIN_NAME,
                email=ADMIN_EMAIL,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                is_active=True,
            ))
            db.commit()
            print(f"✓ Admin creado: {ADMIN_EMAIL}")

        # El email sí, la contraseña no: la persona que la escribió ya la sabe,
        # y esta salida termina en los logs de quien corrió el docker exec.
        print(f"  Email: {ADMIN_EMAIL}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
