# Crow Repuestos — Backend (FastAPI + Postgres)

API REST para Crow Repuestos: autenticación con JWT, control de acceso por roles
(`USER` / `ADMIN`), y CRUD de productos, categorías, marcas, cotizaciones y usuarios.

## Stack

- **FastAPI** + **SQLAlchemy 2** + **Pydantic v2**
- **PostgreSQL 16**
- **Docker / docker-compose**
- Auth: OAuth2 password flow + JWT (python-jose), hashing con bcrypt (passlib)

## Levantar con Docker (recomendado)

```bash
cd backend
docker compose up --build
```

Esto levanta Postgres + la API, crea las tablas y corre el seed.

- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs
- Healthcheck: http://localhost:8000/health

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
pip install -r requirements.txt
cp .env.example .env          # ajustá DATABASE_URL a tu Postgres local
python -m app.seed            # crea tablas + datos demo
uvicorn app.main:app --reload
```

## Estructura

```
app/
  main.py              App FastAPI, CORS, montaje de routers
  core/                config, database, security (JWT/bcrypt), deps (guards)
  models/              SQLAlchemy: User, Category, Brand, Product, Quote
  schemas/             Pydantic v2 (request/response)
  crud/                CRUD genérico reutilizable + instancias por entidad
  api/routes/          auth, users, categories, brands, products, quotes, dashboard
  seed.py              Datos iniciales (idempotente)
```

## Endpoints principales

| Método | Ruta                          | Acceso  |
|--------|-------------------------------|---------|
| POST   | `/api/auth/register`          | público |
| POST   | `/api/auth/login`             | público |
| GET    | `/api/auth/me`                | logueado|
| GET    | `/api/products`               | público (filtros: `q`, `category_id`, `brand_id`, `vehicle_type`, `in_stock`, `featured`) |
| POST/PATCH/DELETE | `/api/products/*`  | ADMIN   |
| GET/POST/PATCH/DELETE | `/api/categories/*`, `/api/brands/*` | GET público · resto ADMIN |
| POST   | `/api/quotes`                 | público |
| GET    | `/api/quotes/me`              | logueado|
| GET    | `/api/quotes`, PATCH status   | ADMIN   |
| GET    | `/api/users`, PATCH, DELETE   | ADMIN   |
| GET    | `/api/dashboard`              | ADMIN   |

El control de acceso por rol está en `app/core/deps.py` (`require_admin`).
```
