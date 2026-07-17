"""
Regresión: las CHECK constraints agregadas en las migraciones 005 y 011
(products.stock >= 0, products.price > 0, quotes.message no vacío)
existían solo como SQL crudo en Alembic, sin reflejo en los modelos de
SQLAlchemy. Como la suite de tests usa SQLite en memoria vía
`Base.metadata.create_all()` (no corre las migraciones de Postgres), esas
constraints eran invisibles para los tests -- un bug que dejara stock
negativo o un precio <= 0 hubiera pasado sin que ningún test lo detectara,
aunque en producción (Postgres real) sí hubiera fallado.

Estos tests fuerzan la violación directamente contra la sesión de DB
(bypaseando la validación de Pydantic en las rutas) para confirmar que el
`__table_args__` de cada modelo realmente reproduce la constraint.
"""
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.product import Product
from app.models.quote import Quote


class TestProductConstraints:
    def test_negative_stock_rejected(self, db, category):
        p = Product(name="Stock negativo", sku="NEG-STOCK", stock=-1, category_id=category.id)
        db.add(p)
        with pytest.raises(IntegrityError):
            db.flush()

    def test_zero_price_rejected(self, db, category):
        p = Product(name="Precio cero", sku="ZERO-PRICE", stock=1, price=0, category_id=category.id)
        db.add(p)
        with pytest.raises(IntegrityError):
            db.flush()

    def test_negative_price_rejected(self, db, category):
        p = Product(name="Precio negativo", sku="NEG-PRICE", stock=1, price=-100, category_id=category.id)
        db.add(p)
        with pytest.raises(IntegrityError):
            db.flush()

    def test_null_price_allowed(self, db, category):
        # price es nullable -- "sin precio informado" es un estado válido.
        p = Product(name="Sin precio", sku="NULL-PRICE", stock=1, price=None, category_id=category.id)
        db.add(p)
        db.flush()  # no debe lanzar
        assert p.id is not None

    def test_positive_stock_and_price_allowed(self, db, category):
        p = Product(name="Producto válido", sku="OK-001", stock=3, price=999.99, category_id=category.id)
        db.add(p)
        db.flush()
        assert p.id is not None


class TestQuoteConstraints:
    def test_blank_message_rejected(self, db):
        q = Quote(customer_name="Cliente", message="   ")
        db.add(q)
        with pytest.raises(IntegrityError):
            db.flush()

    def test_empty_message_rejected(self, db):
        q = Quote(customer_name="Cliente", message="")
        db.add(q)
        with pytest.raises(IntegrityError):
            db.flush()

    def test_nonblank_message_allowed(self, db):
        q = Quote(customer_name="Cliente", message="Necesito un presupuesto para pastillas de freno")
        db.add(q)
        db.flush()
        assert q.id is not None
