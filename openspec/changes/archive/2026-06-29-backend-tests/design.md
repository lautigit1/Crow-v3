# Design: backend-tests

## Estructura de archivos

```
backend/tests/
├── conftest.py          — fixtures compartidas (client, db, admin_token, user_token, supplier)
├── test_auth.py         — ya existía
├── test_products.py     — ya existía
├── test_quotes.py       — fix 2 tests rotos por quotes-pagination
├── test_categories.py   — nuevo
├── test_brands.py       — nuevo
├── test_suppliers.py    — nuevo
├── test_users.py        — nuevo
└── test_dashboard.py    — nuevo
```

## Fixture nueva: `supplier`

```python
@pytest.fixture
def supplier(db):
    s = Supplier(name="TestSupplier", contact_email="s@test.com", is_active=True)
    db.add(s); db.commit(); db.refresh(s)
    yield s
    db.delete(s); db.commit()
```

## Cobertura por módulo

| Archivo | Tests | Qué cubre |
|---|---|---|
| test_quotes.py (fix) | 2 | Nuevo formato `{items, total}` en `GET /quotes/me` |
| test_categories.py | 14 | CRUD + permisos público/admin |
| test_brands.py | 14 | CRUD + permisos público/admin |
| test_suppliers.py | 17 | CRUD + `product_count` calculado + active filter |
| test_users.py | 17 | List, update, soft-delete, no borrarse a sí mismo |
| test_dashboard.py | 13 | Stats + analytics requieren admin, valores correctos |

## Convenciones

- Tests nombrados `test_<acción>_<caso>` (ej: `test_create_category_success`)
- Cada test crea sus propios datos y los limpia al finalizar
- No se usa `time.sleep()` ni servicios externos
- Passwords cumplen política: mínimo 10 chars, upper + lower + digit + special
