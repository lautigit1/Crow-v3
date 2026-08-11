from collections.abc import Generator

from fastapi import Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from app.core.post_commit import ejecutar_post_commit

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


def get_db(request: Request) -> Generator[Session, None, None]:
    """
    Unit-of-Work dependency: one session/transaction per request.

    Routes and CRUD never call ``commit()`` themselves — they only ``add`` /
    ``flush``. This boundary commits once if the request succeeds, or rolls the
    whole thing back if anything raises, guaranteeing atomicity per request.

    Y es también el único lugar que sabe cuándo la transacción confirmó, así que
    es el que dispara los efectos que dependen de eso -- correos y eventos de la
    campana, ver ``core/post_commit.py``. Antes eso lo hacía ``BackgroundTasks``,
    que corría después del commit hasta FastAPI 0.115 y pasó a correr antes en
    0.141; atarlo acá lo vuelve independiente de esa versión.
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

    # Solo se llega a esta línea si el commit salió bien: si algo falló, la
    # excepción salió por el ``raise`` de arriba (el ``finally`` no la traga) y
    # las tareas encoladas se descartan junto con la request.
    ejecutar_post_commit(request)


def check_db_connection() -> bool:
    """Ping the database. Returns True if reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
