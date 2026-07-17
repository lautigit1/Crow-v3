# Apply: pgbouncer-and-commit-conventions

## Resumen

Cierra los dos últimos hallazgos de "necesidad media" de la auditoría técnica del 2026-07-13: un connection pooler externo delante de Postgres (preparación para escalar el API a más de un proceso/réplica) y tooling que exige Conventional Commits, más la documentación de tags de versión y del paso manual de branch protection que no se puede automatizar desde este entorno.

## Archivos modificados

**pgbouncer:**
- `docker-compose.prod.yml` — nuevo servicio `pgbouncer`; `api` repuntado a `pgbouncer:6432` + nueva var `ALEMBIC_DATABASE_URL` directo a `db:5432`.
- `backend/app/core/config.py` — campo `ALEMBIC_DATABASE_URL` + property `alembic_database_url` (fallback a `DATABASE_URL`).
- `backend/alembic/env.py` — usa `settings.alembic_database_url`.
- `DEPLOY.md` — stack actualizado, nota de troubleshooting.

**Conventional Commits:**
- `package.json` (nuevo, raíz) — `husky` + `@commitlint/cli` + `@commitlint/config-conventional`.
- `commitlint.config.js` (nuevo).
- `.husky/commit-msg` (nuevo).
- `CONTRIBUTING.md` (nuevo) — commits, tags de versión, branch protection.
- `.gitignore` — ignora `/node_modules/` de la raíz.

## Decisiones documentadas

- Modo transacción de pgbouncer confirmado seguro por inspección de código (sin `LISTEN`/`NOTIFY`, advisory locks ni temp tables en el backend), no asumido.
- `ALEMBIC_DATABASE_URL` separado de `DATABASE_URL` para que las migraciones (DDL) sigan una conexión directa a Postgres, evitando cualquier incompatibilidad entre DDL y el modo transacción del pooler. Vacío por default — cero impacto en desarrollo local, donde no hay pgbouncer en el compose.
- Se corrigió un comentario que afirmaba (incorrectamente) que este repo usa `ALTER TYPE ... ADD VALUE` en sus migraciones — verificado por grep antes de dejarlo en el código, y reemplazado por una justificación genérica y verificable.
- `commitlint` no fuerza el idioma ni el casing del mensaje (`subject-case` deshabilitado) — solo la estructura `tipo: descripción`, respetando que el repo comitea en español.
- Branch protection **no se configuró** — requiere permisos de admin de GitHub que este entorno no tiene. Se documentó el checklist exacto en `CONTRIBUTING.md` para que quien administre el repo lo aplique manualmente.

## Verificación

- `python3 -c "import yaml; yaml.safe_load(open('docker-compose.prod.yml'))"` → YAML válido. (`docker compose config` no disponible en el entorno — sin Docker instalado.)
- `pytest` (backend) → 249/249 tests pasando, sin regresiones por los cambios en `config.py`/`alembic/env.py`.
- Hook `.husky/commit-msg` probado directamente: mensaje sin formato → rechazado (`exit 1`, detalle de qué falta); mensaje `chore: prueba de hook conventional commits` → aceptado (`exit 0`).
- `.env.example` revisado — no requiere variables nuevas (pgbouncer reusa `POSTGRES_PASSWORD` ya existente, referenciado inline en `docker-compose.prod.yml`).

## Pendiente (fuera de alcance de este change, requiere acción del usuario)

- **Branch protection en `master`**: checklist manual documentado en `CONTRIBUTING.md`, requiere que alguien con acceso admin al repo de GitHub lo configure desde Settings → Branches.
- **`npm install` en la raíz**: necesario una vez (por clon/entorno) para que el hook de commitlint quede activo — no corre solo, es parte del flujo normal de setup de un repo con husky.
- Generación automática de changelog a partir del historial de commits (ahora parseable) — no implementada, mencionada como posible trabajo futuro en `CONTRIBUTING.md`.
