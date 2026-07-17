# Apply: backend-critical-fixes

## Resumen

Tres fixes de backend que cierran hallazgos críticos de la auditoría del 2026-07-13: N+1 en el listado de pedidos, validación faltante en el registro público de usuarios, y CHECK constraints de base de datos invisibles para la suite de tests.

## Archivos modificados

**Modificado:**
- `backend/app/api/routes/orders.py` — `selectinload(Order.items)` en `my_orders` y `admin_list_orders`.
- `backend/app/schemas/auth.py` — `RegisterRequest.full_name`/`.phone` alineados con los límites de `UserBase`.
- `backend/app/models/product.py` — `__table_args__` con las CHECK constraints de la migración 005.
- `backend/app/models/quote.py` — `__table_args__` con la CHECK constraint de la migración 011 (adaptada a `trim()` para compatibilidad con SQLite).
- `backend/tests/test_orders.py` — clase `TestOrdersNPlusOne` (2 tests, conteo real de queries).
- `backend/tests/test_auth.py` — 2 tests nuevos en `TestRegister` para los límites de longitud.

**Nuevo:**
- `backend/tests/test_model_constraints.py` — 8 tests (`TestProductConstraints`, `TestQuoteConstraints`) que ejercitan las CHECK constraints directo contra la sesión de DB.

## Decisiones documentadas

- El test de N+1 cuenta queries SQL reales vía `sqlalchemy.event.listen(engine, "before_cursor_execute", ...)` en vez de solo validar la respuesta — es el único enfoque que efectivamente detecta una regresión a N+1 (ver `design.md`).
- La CHECK constraint de `Quote.message` usa `trim()` en el modelo en vez de `btrim()` (que sí usa la migración 011 en Postgres) porque `btrim()` no existe en SQLite, el motor que usa la suite de tests. Ambas funciones son equivalentes para este caso de uso (recortar espacios en blanco de los extremos).
- Se documentó, pero no se corrigió en este change, una inconsistencia preexistente entre `ProductBase.price` (Pydantic, permite 0 con `ge=0`) y la CHECK constraint de Postgres (`price > 0`, estricta) — queda fuera de alcance de este fix puntual.

## Verificación

- `pytest tests/test_orders.py` → 23/23.
- `pytest tests/test_auth.py` → 24/24.
- `pytest tests/test_model_constraints.py` → 8/8.
- `pytest tests/test_products.py tests/test_quotes.py tests/test_orders.py` → 58/58 (confirma que las nuevas CHECK constraints no rompen ningún flujo existente de creación/actualización de productos o presupuestos).
- Suite completa de backend, corrida en 4 tandas por el límite de tiempo del entorno de verificación (no del proyecto): 24 + 58 + 71 + 88 + 8 = **249/249 pasando**, sin regresiones.

## Nota de entorno (tooling, no del proyecto)

Durante la implementación se detectó una desincronización recurrente entre el canal de edición de archivos y la vista de la shell usada para correr `pytest` sobre la carpeta del proyecto (sincronizada vía OneDrive): después de cada edición, la shell veía temporalmente una copia desactualizada/truncada del archivo. Se resolvió con un patrón de tres pasos por archivo afectado — releer el contenido autoritativo, escribirlo a un archivo nuevo, y reemplazar el original vía `mv` en la shell — antes de cada corrida de verificación. No afectó el resultado final, solo agregó pasos de verificación intermedios.

## Pendiente (fuera de alcance de este change)

- Inconsistencia `price >= 0` (Pydantic) vs. `price > 0` (constraint) en `ProductBase` — señalada en `design.md`.
- Cache de queries / Redis para los listados de pedidos — optimización de performance más amplia, no un fix de N+1 puntual.
