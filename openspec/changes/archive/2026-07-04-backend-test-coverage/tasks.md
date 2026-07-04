# Tasks: backend-test-coverage

- [x] T1 — Fix `seo.py`: `Depends(get_db)` en vez de `next(get_db())`.
- [x] T2 — `tests/test_audit.py`
- [x] T3 — `tests/test_favorites.py`
- [x] T4 — `tests/test_settings.py`
- [x] T5 — `tests/test_orders.py`
- [x] T6 — `tests/test_seo.py`
- [x] T7 — Usuario corre `pytest` y comparte resultado (198 passed, 9 failed en la primera corrida).
- [x] T8 — Corregir lo que falle, archivar el change.

## T7 — resultado de la primera corrida

198 passed, 9 failed. Dos causas raíz, ninguna relacionada con lógica de
negocio real:

1. **Bug real en `favorites.py` y `orders.py`**: estas dos rutas hacían
   `db.commit()`/`db.rollback()` propio, violando la convención
   documentada en `core/database.py::get_db()` ("Routes and CRUD never
   call commit() themselves"). En testing, el fixture `db` aísla cada
   test con una transacción que se revierte al final; un commit real
   dentro de la ruta cierra esa transacción antes de tiempo, filtrando
   filas (usuarios, productos, pedidos, favoritos) de un test a los
   siguientes. Fix: se sacaron los `commit()/rollback()` de
   `add_favorite` (ahora chequea existencia antes de insertar, en vez
   de insertar-y-atrapar `IntegrityError`), `remove_favorite`,
   `create_order`, `cancel_my_order` y `admin_update_order` — todas
   pasan a usar solo `db.flush()`, dejando el commit único al final del
   request en manos de `get_db()`.
2. **Falso supuesto en `test_audit.py`**: el login que hace el fixture
   `admin_client` ya genera una fila `login.success` en el audit log
   (comportamiento correcto de la app). Cuatro tests asumían un audit
   log vacío o con conteos exactos sin contar ese login. Fix: los tests
   ahora usan un baseline (`admin_client.get(BASE).json()["total"]`)
   antes de agregar sus propias filas, en vez de asumir un total
   absoluto.

Ningún test de `test_settings.py` ni `test_seo.py` falló.
