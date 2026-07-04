# Tasks: prod-readiness-fixes

## Implementation tasks

- [x] **T1** — Eliminar `volumes: - ./:/app` de `backend/docker-compose.yml`
- [x] **T2** — Documentar en `backend/README.md` que ese Compose es solo para desarrollo local
- [x] **T3** — Agregar `has_insecure_cors` a `Settings` (`backend/app/core/config.py`)
- [x] **T4** — Agregar validación en `lifespan()` (`backend/app/main.py`): fallar si `is_production` y `has_insecure_cors`
- [x] **T5** — Migración Alembic `008_quote_audit_indexes.py`: índice en `quotes.user_id`
- [x] **T6** — Migración `008`: índice descendente en `audit_logs.created_at`
- [x] **T7** — Verificar cambios (ver nota en apply.md: `pytest` no se pudo ejecutar en este sandbox por falta de acceso a red para instalar dependencias; se verificó sintaxis y consistencia manualmente vía lectura de archivo completo)
