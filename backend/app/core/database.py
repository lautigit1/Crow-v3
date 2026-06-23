from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,           # verify connection health before use
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """
    Unit-of-Work dependency: one session/transaction per request.

    Routes and CRUD never call ``commit()`` themselves — they only ``add`` /
    ``flush``. This boundary commits once if the request succeeds, or rolls the
    whole thing back if anything raises, guaranteeing atomicity per request.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def check_db_connection() -> bool:
    """Ping the database. Returns True if reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
