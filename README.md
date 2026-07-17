# Crow Repuestos

E-commerce de repuestos automotor: catálogo, cotizaciones, pedidos y panel de administración. Monorepo con backend (FastAPI) y frontend (React) separados, más la infraestructura de despliegue (Docker Compose + Caddy + nginx).

## Stack

- **Backend**: FastAPI + SQLAlchemy 2 + Pydantic v2 + PostgreSQL 16 + Redis. Ver [`backend/README.md`](backend/README.md).
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query + Tailwind CSS, con arquitectura Feature-Sliced Design (`app/pages/widgets/features/entities/shared`).
- **Infraestructura**: Docker Compose para desarrollo (`docker-compose.yml`) y producción (`docker-compose.prod.yml`, con pgbouncer + Caddy con TLS automático) — ver [`DEPLOY.md`](DEPLOY.md).
- **CI**: GitHub Actions — lint + tests + build en cada push/PR (`.github/workflows/`).

## Levantar el stack completo (desarrollo local)

```bash
cp .env.example .env   # completar SECRET_KEY, POSTGRES_PASSWORD, SEED_ADMIN_PASSWORD
docker compose up --build
```

- Frontend: http://localhost:8080
- API + Swagger: http://localhost:8000/docs

Para trabajar solo en un lado del stack (hot reload de Vite, o la API sin rebuildear la imagen en cada cambio), ver las instrucciones de desarrollo sin Docker en [`backend/README.md`](backend/README.md) y `frontend/package.json` (`npm run dev`).

## Estructura del repo

```
backend/            API FastAPI -- 14 módulos de rutas, 11 modelos (ver backend/README.md)
frontend/           SPA React (Feature-Sliced Design)
deploy/             Configuración de Caddy y nginx para producción
docs/                Documentación adicional
openspec/           Historial de cambios estructurados (proposal/design/tasks/apply por cambio)
docker-compose.yml       Stack de desarrollo local
docker-compose.prod.yml  Stack de producción (pgbouncer, Caddy, sin montar código fuente)
```

## Calidad de código

- **Frontend**: `npm run lint` (ESLint + Steiger para arquitectura FSD), `npm run typecheck`, `npm run test:run` (Vitest), `npm run e2e` (Playwright, 12 tests contra el stack completo).
- **Backend**: `ruff check .`, `pytest` (249 tests).

Los cuatro corren bloqueantes en CI (`.github/workflows/frontend.yml`, `backend.yml`, `e2e.yml`).

## Contribuir

Commits en formato [Conventional Commits](https://www.conventionalcommits.org/) (validado por un git hook local) y guía de versionado — ver [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Deploy

Ver [`DEPLOY.md`](DEPLOY.md) para el procedimiento completo de primer deploy y actualización en producción.

## Documentación técnica

- [`backend/README.md`](backend/README.md) — módulos, modelos, endpoints, cómo correr tests.
- [`DEPLOY.md`](DEPLOY.md) — despliegue a producción.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — convención de commits, versionado.
- [`openspec/changes/archive/`](openspec/changes/archive/) — historial de cada cambio no trivial hecho al repo, con su justificación y verificación.
