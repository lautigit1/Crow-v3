# Crow Repuestos

Plataforma web para una distribuidora automotriz: sitio público (landing + catálogo),
área de cliente y panel de administración con CRUD, todo con autenticación por roles.

```
Crow v3/
├── backend/     FastAPI + PostgreSQL + Docker (API REST, JWT, roles)
├── frontend/    React + TypeScript + Vite (Feature-Sliced Design, estilos inline)
└── crow-react/  Prototipo inicial (HTML→React). Superado por frontend/ — se puede borrar.
```

## Arranque rápido (todo con Docker)

Desde la raíz del proyecto, un solo comando levanta **frontend + backend + Postgres**:

```bash
docker compose up --build
```

- **Sitio web:** http://localhost:8080
- **API (Swagger):** http://localhost:8000/docs
- Las tablas y los datos demo se crean automáticamente al iniciar.

Para apagar todo: `docker compose down` (agregá `-v` para borrar también la base de datos).

### Cómo encaja

```
navegador → web (nginx :8080) ──/api──▶ api (FastAPI :8000) ──▶ db (Postgres :5432)
                 │
                 └── sirve el build estático de React (SPA)
```

nginx sirve el frontend y hace de proxy de `/api` hacia el backend, así que todo es
del mismo origen (sin problemas de CORS).

### Desarrollo (sin Docker, con hot-reload)

```bash
# Terminal 1 — backend (requiere Postgres local o `docker compose up db`)
cd backend && pip install -r requirements.txt && python -m app.seed && uvicorn app.main:app --reload

# Terminal 2 — frontend
cd frontend && npm install && npm run dev      # http://localhost:5173 (proxya /api → :8000)
```

## Cuentas demo

| Rol   | Email                       | Password    | Acceso                          |
|-------|-----------------------------|-------------|---------------------------------|
| ADMIN | admin@crowrepuestos.com     | admin1234   | Panel `/admin` + todo el sitio  |
| USER  | cliente@crowrepuestos.com   | cliente1234 | Área de cliente `/cuenta`       |

## Qué incluye

**Sitio público** — navbar minimalista (Inicio · Catálogo · Marcas · Contacto) con
buscador y menú de cuenta; landing simplificada (hero, categorías, marcas, destacados,
CTA); catálogo con filtros (búsqueda, categoría, marca, tipo de vehículo, stock);
footer premium. Paleta corporativa azul eléctrico (#0057D9) sobre navies industriales.

**Autenticación y roles** — login/registro con JWT; control de acceso por rol
(`USER` / `ADMIN`); rutas protegidas (`RequireAuth`, `RequireAdmin`). El panel de admin
nunca es visible para usuarios normales.

**Área de cliente** (`/cuenta`) — perfil editable, mis cotizaciones (estado en vivo),
mis pedidos, favoritos (guardados localmente), cambio de contraseña.

**Panel de administración** (`/admin`, solo ADMIN) — sidebar agrupado con iconos y
módulos: **Dashboard** (stat cards + gráficos), **Productos** (CRUD), **Inventario**
(control de stock con edición inline y alertas de stock bajo), **Categorías** y
**Marcas** (CRUD), **Cotizaciones** (estados Nueva → En revisión → Respondida →
Finalizada), **Usuarios** (roles), **Reportes** (analítica con gráficos SVG),
**Auditoría** (registro de eventos de seguridad) y **Configuración**. Iconografía SVG
propia (sin emojis ni dependencias externas).

**Seguridad** — hashing bcrypt, JWT, control de acceso por rol; headers de seguridad
(nosniff, anti-clickjacking, referrer-policy), **rate-limiting** de login con bloqueo
temporal, política de contraseñas (mínimo 8, letra + número) y **log de auditoría**
inmutable de logins y cambios.

**Patrón Unit of Work** — una transacción por request: las rutas y el CRUD solo hacen
`add`/`flush`; el commit (o rollback ante error) ocurre una sola vez en el límite del
request, garantizando atomicidad sin commits dispersos.

## Arquitectura del frontend (Feature-Sliced Design)

```
src/
  app/        Providers (auth), router + guards, layouts, estilos globales
  pages/      home, catalog, brands, contact, auth, account/*, admin/*
  widgets/    navbar, footer, hero, category-grid, brand-strip, featured-products, cta
  features/   auth (account menu), quote (modal de cotización)
  entities/   product, category, brand, quote, user, session (tipos + API)
  shared/     ui (kit inline), api (axios), lib (Hoverable, hooks), config (theme, contacto)
```

Cada feature/entity expone su propia API tipada que consume el backend FastAPI.
Ver `backend/README.md` y `frontend/` para más detalle.
