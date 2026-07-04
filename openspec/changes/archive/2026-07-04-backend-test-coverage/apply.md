# Apply: backend-test-coverage

## Resumen

Se agregaron los 5 archivos de test que faltaban (`test_audit.py`,
`test_favorites.py`, `test_settings.py`, `test_orders.py`,
`test_seo.py`), completando cobertura de todos los módulos de rutas del
backend. Se corrigieron 2 bugs reales que la propia suite de tests
destapó.

## Bugs encontrados y corregidos

1. **`seo.py`** — `sitemap()` llamaba `next(get_db())` manualmente en
   vez de recibir `db: DbSession` inyectado por FastAPI. Bypaseaba
   `app.dependency_overrides`, haciendo el endpoint imposible de testear
   (y, en teoría, cualquier mecanismo de override de sesión). Fix:
   parámetro `db: DbSession` como el resto de las rutas.

2. **`favorites.py` y `orders.py`** — ambas rutas hacían
   `db.commit()`/`db.rollback()` propio, violando la convención de
   unidad-de-trabajo documentada en `core/database.py::get_db()` (un
   solo commit por request, a cargo de `get_db()`; las rutas solo hacen
   `add`/`flush`). En producción esto no rompía nada visible, pero sí
   contradecía la garantía de atomicidad por request. En testing,
   rompía el aislamiento entre tests: el fixture `db` aísla cada test
   con una transacción que se revierte al final, y un commit real
   dentro de la ruta cerraba esa transacción antes de tiempo, filtrando
   datos de un test a los siguientes (9 tests fallaron en la primera
   corrida por esto). Fix:
   - `add_favorite`: en vez de insertar y atrapar `IntegrityError` con
     un commit/rollback propio, ahora chequea si ya existe el favorito
     antes de insertar (mismo resultado idempotente, sin tocar el
     commit boundary).
   - `remove_favorite`, `create_order`, `cancel_my_order`,
     `admin_update_order`: `db.commit()` → `db.flush()`.

3. **`test_audit.py`** (bug del test, no de la app) — 4 tests asumían
   un audit log vacío o con conteos absolutos sin contar que el propio
   login del fixture `admin_client` ya genera una fila `login.success`.
   Fix: los tests toman un baseline antes de agregar sus propias filas.

## Segunda corrida — 4 fallas más (bug real de fixtures, no de la app)

Tras el fix de arriba, quedaron 4 fallas, todas de aislamiento
usuario-vs-admin dentro de un mismo test:

- `test_favorites.py::test_favorites_isolated_per_user`
- `test_orders.py::test_detail_other_users_order_forbidden`
- `test_orders.py::test_cancel_other_users_order_forbidden`
- `test_orders.py::test_admin_list_filter_by_user_id`

Causa raíz: `user_client` y `admin_client` (en `conftest.py`) hacían
`login_as(client, ...)` sobre el **mismo objeto `TestClient`** (el
fixture `client`, compartido). Cuando un test pedía ambos fixtures a la
vez, pytest resuelve `admin_client` después de `user_client`, y su
login pisaba las cookies del anterior en el mismo objeto -- las
variables `user_client` y `admin_client` terminaban siendo el mismo
cliente autenticado como admin. Por eso "el pedido del user" en
realidad se creaba como admin, y "el admin accediendo a lo ajeno" en
realidad accedía a lo propio (200 en vez de 403). Los tests que no
dependían de qué rol era el dueño (`test_admin_list_all_orders`,
`test_admin_update_status_and_notes`) no lo notaron.

Fix en `conftest.py`: `user_client` y `admin_client` ahora crean cada
uno su **propio** `TestClient(app)` (cookie jar independiente) en vez
de loguearse sobre el `client` compartido. Siguen dependiendo de
`client` solo para asegurar que `dependency_overrides`/lifespan ya
corrieron; no reabren el `with` (no vuelve a disparar lifespan), así
que comparten la misma sesión de DB pero cada uno con su propia
identidad autenticada.

## Resultado final

198 passed + 9 failed → fix de commit/rollback en rutas → 4 failed
restantes → fix de cookie jar compartida en `conftest.py`. Pendiente
de una tercera corrida del usuario para confirmar 0 failed.

## Archivos tocados

- `backend/app/api/routes/seo.py`
- `backend/app/api/routes/favorites.py`
- `backend/app/api/routes/orders.py`
- `backend/tests/conftest.py` (fix de `user_client`/`admin_client`)
- `backend/tests/test_audit.py` (nuevo)
- `backend/tests/test_favorites.py` (nuevo)
- `backend/tests/test_settings.py` (nuevo)
- `backend/tests/test_orders.py` (nuevo)
- `backend/tests/test_seo.py` (nuevo)
