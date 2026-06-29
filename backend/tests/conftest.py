"""
Shared pytest fixtures for Crow Repuestos backend tests.

Strategy:
- SQLite in-memory database (fast, no external deps, resets between sessions)
- One TestClient per test session; DB tables created once and cleared per test
- Fixtures for regular user, admin user, auth cookies, and domain objects
"""
import os
os.environ["TESTING"] = "1"  # must be set before importing app

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.token_blocklist import token_blocklist
from app.main import app
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.user import User, UserRole

# ---------------------------------------------------------------------------
# SQLite in-memory engine
# ---------------------------------------------------------------------------
SQLITE_URL = "sqlite://"  # pure in-memory, no file

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
)

# Enable foreign key enforcement in SQLite (off by default)
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    dbapi_conn.execute("PRAGMA foreign_keys=ON")

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# Session-scoped: create tables once
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def _create_tables():
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
    transaction.rollback()
    connection.close()


# ---------------------------------------------------------------------------
# Override FastAPI dependency with the test session
# ---------------------------------------------------------------------------
@pytest.fixture()
def client(db: Session):
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    # Reset in-memory blocklist between tests
    token_blocklist._entries.clear()

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
    return login_as(client, user.email)


@pytest.fixture()
def admin_client(client: TestClient, admin: User) -> TestClient:
    return login_as(client, admin.email)


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
 