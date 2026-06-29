# Tasks: critical-fixes

## Implementation tasks

- [x] **T1** — Reemplazar credenciales hardcodeadas en `docker-compose.yml` (raíz) por `${VAR}`
- [x] **T2** — Reemplazar credenciales hardcodeadas en `backend/docker-compose.yml` por `${VAR}`
- [x] **T3** — Agregar validación de `SECRET_KEY` en startup de FastAPI (`backend/app/main.py`)
- [x] **T4** — Crear `.env.example` en la raíz del proyecto con variables requeridas
- [x] **T5** — Unificar `ACCESS_TOKEN_EXPIRE_MINUTES` a `30` en `docker-compose.yml` (raíz)
- [x] **T6a** — Migración Alembic `004_product_deleted_at.py`: agregar columna `deleted_at` a `products`
- [x] **T6b** — Actualizar modelo `Product`: agregar campo `deleted_at: Mapped[datetime | None]`
- [x] **T6c** — Actualizar schema `ProductRead`: exponer `deleted_at`
- [x] **T6d** — Endpoint delete: setear `deleted_at=datetime.now(UTC)` al hacer soft delete
- [x] **T6e** — Nuevo endpoint `PATCH /api/products/{id}/restore` (admin only)
- [x] **T6f** — Fix dashboard: agregar filtro `is_deleted = False` en todas las queries de productos
- [x] **T6g** — Frontend: tab "Eliminados" en AdminProductsPage con fecha ART y botón Restaurar
- [x] **T7** — Fix register limiter: eliminar llamada incorrecta a `register_failure()` en el path exitoso (`backend/app/api/routes/auth.py`)
- [x] **T8** — Fix `build:ci` en `frontend/package.json`: agregar `tsc --noEmit &&` antes de `vite build`
- [x] **T9** — Actualizar `.gitignore` con `node_modules/`, `__pycache__/`, `.pytest_cache/`, etc.
- [x] **T10** — Remover `frontend/node_modules/` del tracking de git (`git rm -r --cached`)
