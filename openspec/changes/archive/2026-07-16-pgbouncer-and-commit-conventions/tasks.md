# Tasks: pgbouncer-and-commit-conventions

## Implementation tasks

- [x] **T1** — Verificar por grep que el backend no usa features de sesión incompatibles con pgbouncer en modo transacción (LISTEN/NOTIFY, advisory locks, temp tables)
- [x] **T2** — Agregar servicio `pgbouncer` a `docker-compose.prod.yml` (modo transacción, healthcheck)
- [x] **T3** — Repuntar `DATABASE_URL` del servicio `api` a `pgbouncer:6432`; agregar `depends_on: pgbouncer (service_healthy)`
- [x] **T4** — Agregar `ALEMBIC_DATABASE_URL` (directo a `db:5432`) en `docker-compose.prod.yml` y en `backend/app/core/config.py` (con fallback a `DATABASE_URL`)
- [x] **T5** — Usar `settings.alembic_database_url` en `backend/alembic/env.py`
- [x] **T6** — Validar sintaxis de `docker-compose.prod.yml` (YAML parse; `docker compose config` no disponible en el entorno)
- [x] **T7** — Actualizar `DEPLOY.md` (mención en la descripción del stack + nota de troubleshooting sobre pgbouncer)
- [x] **T8** — Confirmar que `.env.example` no necesita variables nuevas (pgbouncer reusa `POSTGRES_PASSWORD` existente)
- [x] **T9** — `package.json` raíz + `commitlint.config.js` + husky (`@commitlint/cli`, `@commitlint/config-conventional`)
- [x] **T10** — Hook `.husky/commit-msg` validando cada commit contra Conventional Commits
- [x] **T11** — `CONTRIBUTING.md`: formato de commit, guía de tags SemVer, checklist manual de branch protection
- [x] **T12** — `.gitignore`: ignorar `/node_modules/` de la raíz
- [x] **T13** — Probar el hook con un mensaje inválido (rechazado) y uno válido (aceptado)
- [x] **T14** — `pytest` del backend — 249/249 tests pasando, sin regresiones por los cambios en `config.py`/`env.py`
