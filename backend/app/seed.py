"""Minimal seed: creates only the admin user if it doesn't exist."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User, UserRole


def seed(db: Session) -> None:
    if not db.scalar(select(User).where(User.email == settings.SEED_ADMIN_EMAIL)):
        db.add(User(
            full_name="Administrador",
            email=settings.SEED_ADMIN_EMAIL,
            hashed_password=hash_password(settings.SEED_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
        ))
        db.commit()
        print(f"✓ Admin creado: {settings.SEED_ADMIN_EMAIL}")
    else:
        print(f"→ Admin ya existe: {settings.SEED_ADMIN_EMAIL}")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
