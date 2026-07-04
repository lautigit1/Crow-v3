# Proposal: e2e-playwright-setup

## What

Primer setup de tests end-to-end con Playwright, cerrando el pedido
original del usuario ("cobertura completa de tests + E2E") tras backend
(`archive/2026-07-04-backend-test-coverage`) y frontend
(`archive/2026-07-04-frontend-test-coverage`). Se agrega:

- `frontend/playwright.config.ts`
- `frontend/e2e/helpers.ts` — helpers compartidos (login admin, registro
  de cliente nuevo, logout, creación de producto vía UI admin, y un
  helper de locators para los campos de formulario sin label asociado).
- `frontend/e2e/auth.spec.ts` — registro, login, logout, contraseña
  incorrecta, guards de rutas protegidas.
- `frontend/e2e/shopping-flow.spec.ts` — el flujo completo: admin crea
  un producto → cliente lo busca en el catálogo → lo agrega al carrito
  → checkout con método de pago → pedido confirmado. Incluye también
  el caso sin método de pago elegido y el bloqueo de stock 0.
- `frontend/e2e/admin-products.spec.ts` — CRUD completo de productos
  (crear, editar, eliminar soft, restaurar, destacado).
- `frontend/e2e/favorites.spec.ts` — agregar/quitar favorito, guard de
  ruta.

## Why

Pedido explícito del usuario tras cerrar backend y frontend: "vamos con
e2e". Cubre los flujos de usuario más críticos de punta a punta contra
la app real (backend + frontend + DB reales, no mocks).

## Cómo se corre

Playwright no viene instalado (el sandbox de este agente no tiene
acceso de red para instalarlo) -- lo instala el usuario en su máquina:

```
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

Con el backend (docker compose) y el frontend (`npm run dev`, puerto
5173 por default) corriendo:

```
npm run e2e          # headless
npm run e2e:ui       # modo interactivo, útil para depurar selectores
npm run e2e:report   # abre el último reporte HTML
```

Ver `frontend/e2e/helpers.ts` para las variables de entorno
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` / `E2E_BASE_URL` si tu setup
local difiere del default (admin del `.env` raíz, `localhost:5173`).

## Alcance

- No usa `data-testid` (el proyecto no los tiene en componentes de
  producción) -- los locators se basan en roles, placeholders y texto
  visible, con un helper propio (`fieldControl`) para los campos de
  `Field`/`CompactField` que renderizan el label como `<span>` sin
  asociarlo al input.
- Corre contra datos reales (no hay DB efímera para E2E): cada test que
  necesita un producto/usuario lo crea él mismo con un sufijo único
  (timestamp + random), así no choca con corridas anteriores ni con
  datos ya cargados en la DB de desarrollo.
- Un solo worker (`workers: 1` en la config) -- los tests comparten la
  misma DB real, no una por test, así que se corren en secuencia para
  evitar pisadas de datos entre specs.

## Non-goals

- No cubre TODOS los flujos de admin (categorías, marcas, proveedores,
  usuarios, reportes, auditoría, configuración) -- se priorizaron los
  que ya tenían feature-changes propios en este proyecto (checkout,
  stock, CRUD de productos, favoritos).
- No corre en CI en este change (no hay pipeline de CI configurado en
  el repo todavía).
