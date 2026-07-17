"""
Upsert the admin user with a known password.
Run inside the API container:
    docker exec -it crow_api python scripts/reset_admin.py
"""
import os
import sys

sys.path.insert(0, "/app")

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole

ADMIN_EMAIL    = os.getenv("SEED_ADMIN_EMAIL", "admin@crowrepuestos.com")
ADMIN_NAME     = "Administrador"
ADMIN_PASSWORD = "CrowAdmin@1"   # min 10 chars, upper + lower + digit + special


def main() -> None:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if user:
            user.hashed_password = hash_password(ADMIN_PASSWORD)
            user.role = UserRole.ADMIN
            user.is_active = True
            db.commit()
            print(f"✓ Contraseña actualizada para {ADMIN_EMAIL}")
        else:
            db.add(User(
                full_name=ADMIN_NAME,
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True,
            ))
            db.commit()
            print(f"✓ Admin creado: {ADMIN_EMAIL}")

        print(f"  Email:    {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
