# Proposal: db-integrity-verify

## What

Script idempotente (`backend/scripts/verify_db_integrity.py`) que chequea
si la base real tiene aplicados los objetos que las migraciones 003, 005,
006 y 008 agregan con SQL crudo (no declarado en los modelos de
SQLAlchemy), y crea los que falten.

## Why

Hoy corregimos que Alembic estaba desincronizado (la base se había armado
en algún momento con `Base.metadata.create_all()` en vez de partir de
Alembic desde cero) haciendo `alembic stamp 008` y después
`alembic upgrade head` para aplicar 009/010. El `stamp` le dice a Alembic
"dá por hecho que ya corriste el resto" -- pero no ejecuta esas
migraciones. Si alguna de las anteriores (003, 005, 006, 008) agregaba
algo que `create_all()` no sabe crear (extensiones, CHECK constraints,
índices parciales, índices no declarados con `index=True` en el modelo),
puede faltar en la base real aunque Alembic ahora diga que está en la
revisión que lo agrega -- y como ya quedó "marcado" como aplicado, nunca
lo va a volver a intentar.

Este es exactamente el ítem que había quedado pendiente en la auditoría
técnica original (sección 8, "constraints e índices faltantes") y que se
reabrió por el fix de hoy.

## Qué se verifica

| Origen | Objeto | Tipo |
|---|---|---|
| 003 | `pg_trgm` | extensión (ya tiene auto-fix en el lifespan de `main.py`, se revisa igual) |
| 003 | `ix_products_name_trgm` | índice GIN |
| 003 | `ix_products_description_trgm` | índice GIN |
| 003 | `ix_products_sku_trgm` | índice GIN |
| 005 | `ck_products_stock_nonnegative` | CHECK constraint |
| 005 | `ck_products_price_positive` | CHECK constraint |
| 006 | `ix_products_active_category` | índice parcial |
| 006 | `ix_products_active_brand` | índice parcial |
| 006 | `ix_products_active_vehicle` | índice parcial |
| 006 | `ix_products_active_featured` | índice parcial |
| 008 | `ix_quotes_user_id` | índice |
| 008 | `ix_audit_logs_created_at` | índice |

Nota: no se incluyen `is_deleted` (002) ni `deleted_at`/`updated_at`/etc.
porque esas columnas SÍ están declaradas en los modelos (algunas con
`index=True`), así que `create_all()` las crea igual sin depender de
Alembic.

## Alcance

- Un solo script, se corre a mano dentro del contenedor `api`. No se
  integra a ningún flujo automático (no corre en el `CMD` del Dockerfile)
  para no introducir DDL implícito en cada arranque.
- Idempotente: cada chequeo usa `IF NOT EXISTS` (índices) o una
  verificación previa en `pg_constraint` (constraints, que no soportan
  `IF NOT EXISTS` en Postgres) antes de crear.
