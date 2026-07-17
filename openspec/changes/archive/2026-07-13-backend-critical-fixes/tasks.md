# Tasks: backend-critical-fixes

## Fix 1 — N+1 en pedidos

- [x] **T1** — Agregar `selectinload(Order.items)` en `my_orders` (`GET /api/orders/me`)
- [x] **T2** — Agregar `selectinload(Order.items)` en `admin_list_orders` (`GET /api/orders`)
- [x] **T3** — Test de regresión con conteo real de queries SQL (`TestOrdersNPlusOne`, 1 vs. 6 pedidos)
- [x] **T4** — `pytest tests/test_orders.py` — 23/23 pasando

## Fix 2 — Validación de `RegisterRequest`

- [x] **T5** — `Field(min_length=1, max_length=120)` en `full_name`, `Field(default=None, max_length=40)` en `phone`
- [x] **T6** — Tests `test_register_oversized_full_name_rejected` y `test_register_oversized_phone_rejected`
- [x] **T7** — `pytest tests/test_auth.py` — 24/24 pasando

## Fix 3 — CHECK constraints en los modelos ORM

- [x] **T8** — `__table_args__` con `CheckConstraint` en `Product` (`stock >= 0`, `price IS NULL OR price > 0`)
- [x] **T9** — `__table_args__` con `CheckConstraint` en `Quote` (`length(trim(message)) > 0`)
- [x] **T10** — Nuevo archivo `tests/test_model_constraints.py` con 8 tests (5 de producto, 3 de presupuesto)
- [x] **T11** — `pytest tests/test_model_constraints.py` — 8/8 pasando

## Verificación final

- [x] **T12** — `pytest tests/test_products.py tests/test_quotes.py tests/test_orders.py` — 58/58 pasando (sin regresiones por las nuevas constraints)
- [x] **T13** — Suite completa de backend (18 archivos, 249 tests) — 249/249 pasando, corrida en tandas por el límite de tiempo del entorno de verificación
