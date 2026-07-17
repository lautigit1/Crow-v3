# Proposal: pgbouncer-and-commit-conventions

## What

Dos hallazgos de "necesidad media" de la auditoría técnica del 2026-07-13, agrupados por ser los dos últimos de esa sección y no compartir código entre sí, pero sí alcance ("higiene operativa" del repo):

1. Connection pooler externo (pgbouncer) delante de Postgres en producción.
2. Conventional Commits (tooling que lo haga cumplir) + guía de tags de versión + branch protection en `master`.

## Why

- **pgbouncer**: hoy el API corre un solo proceso `uvicorn` sin `--workers`, así que el pool de SQLAlchemy (`DB_POOL_SIZE=5` + `max_overflow=10`) nunca satura Postgres por sí solo. Pero escalar el API a más de una réplica (o a `uvicorn --workers N`) multiplicaría ese pool por cada instancia, y Postgres tiene un límite fijo de conexiones (`max_connections`). Sin un pooler externo, esa escalada rompería la base de datos la primera vez que se intente.
- **Conventional Commits / tags / branch protection**: el historial de commits del repo es texto libre sin convención (`git log` muestra mensajes como "Subo modificaciones varias"), lo que hace imposible generar un changelog automático o entender el impacto de un commit sin abrir el diff. `master` no tiene ninguna protección — cualquiera con push access puede subir directo sin pasar CI ni review.

## Non-goals

- No se activa `uvicorn --workers N` ni se agregan réplicas del API en este change — pgbouncer se agrega de forma preventiva, listo para cuando se decida escalar, sin que el escalado en sí sea parte de este trabajo.
- No se automatiza la generación de changelog (`conventional-changelog`/`standard-version`) — se deja como posible trabajo futuro ahora que el historial va a ser parseable, documentado en `CONTRIBUTING.md`.
- Branch protection en `master` **no se configura en este change** — requiere permisos de admin de GitHub que este entorno no tiene (ni acceso a la API de administración del repo). Se documenta como paso manual pendiente para quien administre el repo.

## Success criteria

- El API en producción se conecta a Postgres a través de pgbouncer (modo transacción), no directo.
- Las migraciones de Alembic (DDL) siguen conectándose directo a Postgres, bypaseando el pool de transacciones — no rompen si se corren durante el arranque.
- Un commit con mensaje que no sigue Conventional Commits es rechazado por un git hook antes de completarse.
- `CONTRIBUTING.md` documenta el formato de commit, cómo taggear versiones (SemVer) y los pasos manuales exactos para configurar branch protection en GitHub.
- La suite de tests del backend pasa sin regresiones tras los cambios de configuración (`ALEMBIC_DATABASE_URL`).
