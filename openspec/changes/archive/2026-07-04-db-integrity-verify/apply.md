# Apply: db-integrity-verify

## Archivo agregado

- `backend/scripts/verify_db_integrity.py`

## Resultado real (confirmado por el usuario)

De los 12 objetos chequeados, **11 faltaban de verdad** en la base:

- `pg_trgm` (extensión) — ya estaba, gracias al auto-fix agregado antes en el lifespan de `main.py`.
- `ix_products_name_trgm`, `ix_products_description_trgm`, `ix_products_sku_trgm` (índices GIN, migración 003) — faltaban.
- `ck_products_stock_nonnegative`, `ck_products_price_positive` (CHECK constraints, migración 005) — faltaban.
- `ix_products_active_category`, `ix_products_active_brand`, `ix_products_active_vehicle`, `ix_products_active_featured` (índices parciales, migración 006) — faltaban.
- `ix_quotes_user_id`, `ix_audit_logs_created_at` (índices, migración 008) — faltaban.

Los 11 se crearon sin errores. Esto confirma dos cosas:
1. El diagnóstico era correcto: `alembic stamp 008` había marcado esas migraciones como aplicadas sin haber ejecutado nunca su SQL crudo (la base se armó originalmente con `create_all()`).
2. No hay datos existentes que violen los nuevos CHECK constraints (si hubiera un `stock < 0` o `price <= 0` cargado, el `ALTER TABLE ADD CONSTRAINT` habría fallado con un error claro de Postgres, y no fue el caso).

## Estado final

La base ahora tiene realmente aplicado todo lo que las migraciones 001
a 010 describen -- no solo lo que Alembic *cree* que aplicó. El ítem de
la auditoría técnica sobre "constraints e índices faltantes" (sección
8) queda cerrado.

## Cómo volver a correrlo si hace falta

```
docker compose exec api python scripts/verify_db_integrity.py
```

Es idempotente -- correrlo de nuevo con todo ya aplicado no hace nada
(todo sale "OK").
