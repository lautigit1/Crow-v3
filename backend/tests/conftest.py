"""
Shared pytest fixtures for Crow Repuestos backend tests.

Strategy:
- Postgres real (TEST_DATABASE_URL), el mismo motor que producción. Antes era
  SQLite en memoria, que no ve enums, índices parciales, JSONB ni la semántica
  de bloqueos de Postgres: un bug de esa clase pasaba la suite en verde.
- One TestClient per test session; DB tables created once and cleared per test
- Fixtures for regular user, admin user, auth cookies, and domain objects
"""
import os

os.environ["TESTING"] = "1"  # must be set before importing app

# El engine de la app se arma al importar `app.core.database`. Apuntarlo a la
# base de tests evita que algo que abra su propia sesión toque otra base. Si
# falta la variable, se avisa más abajo (acá solo pueden ir asignaciones a
# `os.environ` antes de los imports).
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "")

# Fuerza el fallback en memoria de rate limiters, blocklist y cache del
# dashboard, sin importar qué Redis haya alcanzable.
#
# Hace falta porque la limpieza entre tests (más abajo:
# `token_blocklist._entries.clear()` y `LoginRateLimiter.reset_all_memory_state()`)
# SOLO toca el estado en memoria. Si el proceso encuentra un Redis, esos
# resets no hacen nada: los contadores de la clave `testclient:*` se acumulan
# a lo largo de toda la suite y el cache del dashboard devuelve valores viejos.
#
# Sin esta línea, la suite pasa o falla según si hay un Redis a mano. En CI no
# lo hay y sale verde; corriendo los tests en un contenedor sobre la red de
# `docker compose`, el `crow_redis` del stack de desarrollo se resuelve solo y
# aparecen 8 fallos que no tienen nada que ver con el código.
os.environ["REDIS_URL"] = ""

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.database import Base, get_db
from app.core.post_commit import ejecutar_post_commit
from app.core.ratelimit import IPRateLimiter, LoginRateLimiter
from app.core.security import hash_password
from app.core.token_blocklist import token_blocklist
from app.main import app
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# Postgres de tests
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = os.environ["DATABASE_URL"]
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "Falta TEST_DATABASE_URL: la suite corre contra Postgres. Ver la sección "
        "Tests de backend/README.md. OJO: esa base se vacía al empezar la corrida."
    )

engine = create_engine(TEST_DATABASE_URL)


# ---------------------------------------------------------------------------
# Session-scoped: create tables once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    # Se borra primero por si una corrida anterior se cortó sin teardown.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ---------------------------------------------------------------------------
# Function-scoped: fresh DB state per test via rollback
# ---------------------------------------------------------------------------
@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    # En Postgres un error de integridad aborta la transacción entera y la
    # sesión ya la revirtió; un segundo rollback solo genera un warning.
    if transaction.is_active:
        transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Override FastAPI dependency with the test session
# ---------------------------------------------------------------------------
@pytest.fixture()
def client(db: Session, monkeypatch):
    def _override(request: Request):
        yield db
        # El override reemplaza a `get_db`, así que también tiene que cumplir
        # su otro contrato: vaciar la cola post-commit (core/post_commit.py).
        # Acá no hay commit -- la sesión vive dentro de una transacción que se
        # revierte al final del test para aislarlo -- pero el punto del que
        # cuelgan los efectos es el mismo, y sin esta línea los correos y los
        # eventos de la campana nunca saldrían durante los tests.
        ejecutar_post_commit(request)

    app.dependency_overrides[get_db] = _override
    # `audit.record_standalone` abre su propia sesión y commitea: es el camino
    # de los logins fallidos, que tienen que quedar anotados aunque la request
    # se revierta. Contra Postgres ese commit escaparía de la transacción del
    # test y dejaría filas para el siguiente. Atada a la misma conexión con un
    # savepoint, commitea "de verdad" desde su punto de vista y se revierte igual.
    from app.core import audit

    monkeypatch.setattr(
        audit,
        "SessionLocal",
        sessionmaker(bind=db.connection(), join_transaction_mode="create_savepoint"),
    )
    # Reset in-memory blocklist and rate limiters between tests — the new
    # IP-only limiters share the key "testclient:*" across the whole suite
    # and would otherwise lock out later tests.
    token_blocklist._entries.clear()
    LoginRateLimiter.reset_all_memory_state()
    # Igual que arriba, para el tope general por IP del middleware: la suite
    # entera entra como "testclient", así que sin esto los contadores de un
    # test se suman a los del siguiente.
    IPRateLimiter.reset_all_memory_state()
    # Y el tope de streams SSE: una conexión que un test dejó anotada le
    # comería el cupo al siguiente.
    from app.api.routes.events import limite_de_conexiones
    limite_de_conexiones.reset_memoria()

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def user(db: Session) -> User:
    u = User(
        full_name="Test User",
        email="user@test.com",
        hashed_password=hash_password("Password1!"),
        role=UserRole.USER,
        is_active=True,
    )
    db.add(u)
    db.flush()
    return u


@pytest.fixture()
def admin(db: Session) -> User:
    u = User(
        full_name="Test Admin",
        email="admin@test.com",
        hashed_password=hash_password("Password1!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(u)
    db.flush()
    return u


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def login_as(client: TestClient, email: str, password: str = "Password1!") -> TestClient:
    """POST /api/auth/login and return the same client (cookies are stored)."""
    resp = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return client


@pytest.fixture()
def user_client(client: TestClient, user: User) -> TestClient:
    """
    Cliente logueado como user, con su propia cookie jar.

    OJO: NO reutiliza el objeto `client` para loguearse -- si lo hiciera,
    y un test pide `user_client` y `admin_client` a la vez, el segundo
    login (el que se resuelva último) pisaría las cookies del primero en
    el mismo objeto, dejando a los dos fixtures apuntando efectivamente
    al mismo usuario. `client` ya dejó armado `dependency_overrides` y
    corrió el lifespan una vez (queda abierto durante todo el test); acá
    solo hace falta un TestClient adicional sobre esa misma app ya viva,
    sin volver a entrar por el `with` (no vuelve a disparar lifespan).
    """
    c = TestClient(app, raise_server_exceptions=True)
    return login_as(c, user.email)


@pytest.fixture()
def admin_client(client: TestClient, admin: User) -> TestClient:
    """Cliente logueado como admin -- ver nota en `user_client`."""
    c = TestClient(app, raise_server_exceptions=True)
    return login_as(c, admin.email)


# ---------------------------------------------------------------------------
# Domain fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def category(db: Session) -> Category:
    c = Category(name="Filtros", slug="filtros", is_deleted=False)
    db.add(c)
    db.flush()
    return c


@pytest.fixture()
def brand(db: Session) -> Brand:
    b = Brand(name="Bosch", slug="bosch", is_deleted=False)
    db.add(b)
    db.flush()
    return b


@pytest.fixture()
def product(db: Session, category: Category, brand: Brand) -> Product:
    p = Product(
        name="Filtro de aceite",
        sku="FILT-001",
        stock=10,
        price=1500.00,
        category_id=category.id,
        brand_id=brand.id,
        is_deleted=False,
    )
    db.add(p)
    db.flush()
    return p


@pytest.fixture()
def deleted_product(db: Session) -> Product:
    p = Product(
        name="Producto borrado",
        sku="DEL-001",
        stock=5,
        is_deleted=True,
    )
    db.add(p)
    db.flush()
    return p


@pytest.fixture()
def supplier(db: Session) -> Supplier:
    s = Supplier(name="Distribuidora ABC", is_active=True)
    db.add(s)
    db.flush()
    return s
