# Proposal: backend-tests

## What

Agregar suites de tests para los endpoints faltantes y corregir tests rotos
por el change quotes-pagination.

## Why

Coverage actual ~25-30%: solo existen test_auth.py, test_products.py y
test_quotes.py. No hay cobertura de categories, brands, suppliers, users ni
dashboard. Además test_quotes.py tiene 2 tests rotos por el cambio de
response en `GET /quotes/me` (ahora retorna `{items, total}` en lugar de lista).

## Scope

1. **Fix test_quotes.py** — actualizar `test_user_sees_own_quotes` y
   `test_user_sees_only_own_quotes` al nuevo formato paginado.
2. **test_categories.py** — CRUD completo + acceso público/admin.
3. **test_brands.py** — CRUD completo + acceso público/admin.
4. **test_suppliers.py** — CRUD + `product_count` calculado + conftest fixture.
5. **test_users.py** — list, update, soft-delete, protecciones (no borrarse a sí mismo).
6. **test_dashboard.py** — stats y analytics requieren admin, valores correctos.

## Success criteria

- `pytest` pasa sin errores.
- Cobertura sube de ~25% a ~55-60%.
- Ningún test usa `time.sleep()` ni llama a servicios externos.
