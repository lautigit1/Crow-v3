# Crow Repuestos — Backend (FastAPI + Postgres)

API REST para Crow Repuestos: autenticación con JWT, control de acceso por roles
(`USER` / `ADMIN`), y CRUD de productos, categorías, marcas, proveedores,
cotizaciones, pedidos, favoritos, configuración del sitio y usuarios.

## Stack

- **FastAPI** + **SQLAlchemy 2** + **Pydantic v2**
- **PostgreSQL 16** + **Redis** (blocklist de tokens y rate limiting; opcional, cae a stores en memoria si no está configurado)
- **Docker / docker-compose**
- Auth: OAuth2 password flow + JWT (PyJWT), hashing con bcrypt (librería `bcrypt` directa, sin passlib)
- Linting: **ruff** (`pyproject.toml`)

## Levantar con Docker (desarrollo local)

> Este `docker-compose.yml` es solo para desarrollo local del backend en
> aislamiento (Postgres + API, sin frontend/nginx/Redis). **No usar en
> producción.** El stack de producción es el `docker-compose.yml` de la raíz
> del repo, que no monta código fuente y levanta el stack completo
> (Postgres + Redis + API + nginx/frontend).

```bash
cd backend
docker compose up --build
```

Esto levanta Postgres + la API, crea las tablas y corre el seed.

- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs
- Healthcheck: http://localhost:8000/api/health

## Cuentas sembradas (seed)

| Rol   | Email                        | Password    |
|-------|------------------------------|-------------|
| ADMIN | admin@crowrepuestos.com      | admin1234   |
| USER  | cliente@crowrepuestos.com    | cliente1234 |

> Cambiá estas credenciales con las variables `SEED_*` en `docker-compose.yml`
> (o `.env`) antes de cualquier despliegue real.

## Correr sin Docker

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env          # ajustá DATABASE_URL a tu Postgres local
python -m app.seed            # crea tablas + datos demo
uvicorn app.main:app --reload
```

## Lint y tests

```bash
ruff check .        # lint -- bloqueante en CI
pytest               # 249 tests -- bloqueante en CI
```

## Estructura

```
app/
  main.py              App FastAPI, CORS, middlewares, montaje de routers
  core/                config, database, security (JWT/bcrypt), deps (guards),
                       ratelimit, token_blocklist, audit, email, cookies, exceptions
  models/              SQLAlchemy -- 11 modelos (ver abajo)
  schemas/             Pydantic v2 (request/response)
  crud/                CRUD genérico reutilizable + instancias por entidad
  api/routes/          14 módulos (ver "Endpoints principales")
  templates/emails/    Plantillas Jinja2 para notificaciones por email
  seed.py              Datos iniciales (idempotente)
alembic/               Migraciones de base de datos
scripts/                Scripts operativos (ej. verify_db_integrity.py)
tests/                 249 tests (pytest)
```

### Modelos (`app/models/`, 11)

`User`, `Category`, `Brand`, `Product`, `Supplier`, `Quote`, `Order`, `OrderItem`,
`UserFavorite`, `Setting`, `AuditLog`.

### Módulos de rutas (`app/api/routes/`, 14)

`auth`, `users`, `categories`, `brands`, `products`, `suppliers`, `quotes`,
`orders`, `favorites`, `settings`, `dashboard`, `audit`, `uploads`, `seo`.

Todos menos `seo` (que expone `sitemap.xml`/`robots.txt` sin prefijo) cuelgan de `/api/*`.

## Endpoints principales

| Método | Ruta                          | Acceso  |
|--------|-------------------------------|---------|
| POST   | `/api/auth/register`, `/login`, `/logout`, `/refresh` | público |
| GET    | `/api/auth/me`                | logueado|
| POST   | `/api/auth/forgot-password`, `/reset-password` | público |
| GET    | `/api/products`               | público (filtros: `q`, `category_id`, `brand_id`, `vehicle_type`, `in_stock`, `featured`) |
| POST/PATCH/DELETE | `/api/products/*`  | ADMIN   |
| GET/POST/PATCH/DELETE | `/api/categories/*`, `/api/brands/*`, `/api/suppliers/*` | GET público · resto ADMIN |
| POST   | `/api/quotes`                 | público |
| GET    | `/api/quotes/me`              | logueado|
| GET    | `/api/quotes`, PATCH status   | ADMIN   |
| GET/POST | `/api/orders/*`              | logueado (propios) · ADMIN (todos) |
| GET/POST/DELETE | `/api/favorites/*`    | logueado |
| GET/PUT | `/api/settings`              | GET público · PUT ADMIN |
| POST   | `/api/uploads/*`              | ADMIN (Cloudinary) |
| GET    | `/api/users`, PATCH, DELETE   | ADMIN   |
| GET    | `/api/dashboard`              | ADMIN   |
| GET    | `/api/audit`                  | ADMIN   |
| GET    | `/sitemap.xml`, `/robots.txt` | público |

El control de acceso por rol está en `app/core/deps.py` (`get_current_user`, `require_admin`, `get_optional_admin`).
