from collections.abc import Generator

from fastapi import Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from app.core.unit_of_work import registrar_sesion

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

    El commit NO se hace acá: lo hace ``UnitOfWorkRoute`` apenas el endpoint
    devuelve, que es antes de que la respuesta salga. El teardown de una
    dependencia corre después de responder (FastAPI 0.141+), así que commitear
    acá dejaba una ventana en la que la API ya había contestado "listo" con
    datos que todavía no estaban en la base. Ver ``core/unit_of_work.py``.

    Lo que sí queda acá es el otro lado del contrato: revertir si algo explotó
    -- la excepción sube antes de que la ruta llegue a commitear -- y cerrar
    siempre la sesión.
    """
    db = SessionLocal()
    registrar_sesion(request, db)
    try:
        yield db
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
