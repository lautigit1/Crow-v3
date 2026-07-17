# Design: pgbouncer-and-commit-conventions

## 1 — pgbouncer en modo transacción

**Verificación previa:** antes de asumir que el modo transacción de pgbouncer es seguro para este backend, se hizo `grep` sobre todo `backend/app/` buscando features de sesión de Postgres que ese modo no soporta (`LISTEN`/`NOTIFY`, advisory locks, temp tables, prepared statements explícitos) — no se encontró ninguno. Se confirmó además, leyendo `backend/app/core/database.py`, que `get_db()` abre exactamente una transacción por request (commit o rollback al final), que es justo el patrón que el modo transacción de pgbouncer espera.

**`docker-compose.prod.yml`** — nuevo servicio `pgbouncer` (imagen `edoburu/pgbouncer:1.24.1-p1`, que soporta configuración por variables de entorno en vez de manejar `pgbouncer.ini`/`userlist.txt` a mano) entre `redis` y `api`:

```yaml
pgbouncer:
  image: edoburu/pgbouncer:1.24.1-p1
  depends_on:
    db:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql://crow:${POSTGRES_PASSWORD}@db:5432/crow_repuestos
    POOL_MODE: transaction
    MAX_CLIENT_CONN: 200
    DEFAULT_POOL_SIZE: 20
    AUTH_TYPE: scram-sha-256
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -p 6432 -U crow"]
```

El servicio `api` ahora depende de `pgbouncer` (`service_healthy`) y su `DATABASE_URL` apunta a `pgbouncer:6432` en vez de `db:5432`.

**Problema a resolver:** repuntar `DATABASE_URL` directo a pgbouncer rompería las migraciones de Alembic, porque el modo transacción no soporta DDL de forma confiable (cada statement puede ir a una conexión física distinta del pool). Solución: variable nueva `ALEMBIC_DATABASE_URL`, que en `docker-compose.prod.yml` apunta directo a `db:5432`, separada de la `DATABASE_URL` que usa el resto del API.

**`backend/app/core/config.py`** — nuevo campo `ALEMBIC_DATABASE_URL: str = ""` y una property:

```python
@property
def alembic_database_url(self) -> str:
    return self.ALEMBIC_DATABASE_URL or self.DATABASE_URL
```

Vacío por default: en desarrollo (sin pgbouncer en el compose de dev) cae a `DATABASE_URL`, mismo comportamiento de siempre — cero cambios para el flujo local.

**`backend/alembic/env.py`** — `config.set_main_option("sqlalchemy.url", ...)` ahora usa `settings.alembic_database_url` en vez de `settings.DATABASE_URL`.

**Nota sobre un comentario descartado:** en un primer borrador se justificó la necesidad de `ALEMBIC_DATABASE_URL` con un comentario afirmando que las migraciones de este repo usan `ALTER TYPE ... ADD VALUE` (un patrón común de migración de enums en Postgres que es incompatible con el modo transacción). Antes de dejarlo en el código se verificó con `grep -rln "ALTER TYPE\|ADD VALUE" alembic/versions/` — cero resultados, la afirmación era falsa para este repo. El comentario final usa una justificación genérica y verificable (DDL corriendo fuera del ciclo request/response normal), no la afirmación específica que no aplicaba.

**Validación:** `docker compose config` no se pudo correr (Docker no está disponible en el entorno de verificación); se validó en su lugar la sintaxis YAML con `python3 -c "import yaml; yaml.safe_load(...)"`.

## 2 — Conventional Commits

**`package.json`** (nuevo, raíz del repo) — proyecto Node separado de `frontend/`/`backend/`, solo para tooling de nivel repo (git hooks, lint de commits). `devDependencies`: `@commitlint/cli`, `@commitlint/config-conventional`, `husky`. Script `prepare: "husky"`, que se corre automáticamente en cada `npm install` y apunta `core.hooksPath` a `.husky/`.

**`commitlint.config.js`** — extiende `@commitlint/config-conventional`, con `subject-case` deshabilitado (`[0]`) para no forzar el mensaje a inglés/cierto casing — el resto del repo comitea en español y eso no cambia, solo se exige la estructura `tipo(scope): descripción`.

**`.husky/commit-msg`** — hook de una línea (`npx --no -- commitlint --edit "$1"`) que valida cada mensaje de commit contra `commitlint.config.js`, rechazando el commit si no cumple.

**`CONTRIBUTING.md`** (nuevo) — documenta el formato de commit con ejemplos, cómo activar el hook (`npm install` en la raíz), guía de tags de versión (SemVer: `git tag -a vX.Y.Z -m "vX.Y.Z"` + `git push origin vX.Y.Z`, con criterio de qué es MAJOR/MINOR/PATCH), y los pasos manuales exactos para configurar branch protection en GitHub (requiere permisos de admin que este entorno no tiene — ver sección de branch protection abajo).

**Branch protection:** no automatizable desde este entorno (sin token de administración de GitHub). `CONTRIBUTING.md` documenta el checklist manual: regla sobre `master`, requerir PR, requerir que pasen los checks de `.github/workflows/backend.yml` y `frontend.yml`, requerir rama actualizada, y opcionalmente aplicar la regla también a admins.
