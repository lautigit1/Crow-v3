# Apply: e2e-playwright-setup

## Resultado final

12/12 tests passed (`npx playwright test --reporter=list`), stack completo
de `docker-compose.yml` (nginx + build + Postgres), `E2E_BASE_URL=http://localhost:8080`.

## Qué se entregó

- `frontend/playwright.config.ts` -- config de Playwright, sin `webServer`
  propio (usa el stack ya levantado por el usuario).
- `frontend/e2e/helpers.ts` -- login/registro/logout/creación de producto
  reutilizables, más `fieldControl()` (helper XPath para campos sin
  `htmlFor`/`id`, patrón usado en `Field.tsx`/`CompactField`).
- 4 specs: `auth.spec.ts`, `shopping-flow.spec.ts`, `admin-products.spec.ts`,
  `favorites.spec.ts`.
- Scripts `e2e`/`e2e:ui`/`e2e:report` en `package.json`, `.gitignore` para
  artifacts de Playwright.

## Ronda 1 -- Setup y arranque

- Los tests fallaban con `net::ERR_CONNECTION_REFUSED`: nada corriendo en
  `localhost:5173`. Se explicó el flujo de dos terminales (backend docker +
  frontend).
- Sintaxis de variables de entorno en PowerShell (`$env:VAR="value"` en
  línea propia, no `VAR=value comando` como en bash).
- El usuario corre todo con el `docker-compose.yml` de la raíz (puerto
  8080), no con Vite dev -- se ajustó `E2E_BASE_URL`.

## Ronda 2 -- Timeouts

7 tests fallaban en la aserción final de `createProductAsAdmin` (fila visible
tras crear). El usuario confirmó manualmente que crear un producto "demora
un poco" contra el stack completo (nginx + build). Se subieron los timeouts
en `playwright.config.ts` (`expect.timeout: 15_000`, `timeout: 60_000` por
test).

## Ronda 3 -- Bug real #1: `pg_trgm` con operador roto

Con los timeouts subidos seguían fallando 6 tests, todos en el mismo punto.
Se agregó instrumentación temporal (`console.log` + `waitForResponse`) en
`createProductAsAdmin` para capturar las respuestas reales de red en vez de
seguir adivinando por el timeout de Playwright. Reveló: el POST de creación
funcionaba (201), pero el GET de búsqueda posterior devolvía **503**
`{"detail":"Error de base de datos..."}`.

`docker compose logs api` mostró el traceback real:
`psycopg2.errors.UndefinedFunction: operator does not exist: character
varying %% unknown`.

Se sospechó primero que faltaba la extensión `pg_trgm` en el volumen de
Postgres del compose de la raíz (un volumen distinto al que se había
arreglado antes en este proyecto). Se probó
`docker compose exec db psql -U crow -d crow_repuestos -c "CREATE EXTENSION
IF NOT EXISTS pg_trgm;"` -- la extensión **ya estaba instalada** ("already
exists, skipping"), descartando esa teoría.

La causa real: `backend/app/api/routes/products.py` usaba
`Product.name.op("%%")(q_clean)` -- doble `%`, un operador que no existe en
Postgres (el operador de similitud de trigramas es `%`, uno solo).
Corregido a `.op("%")`. Requirió `docker compose up --build -d api` para que
el contenedor tomara el fix (no alcanza con reiniciar sin rebuild).

## Ronda 4 -- Bug de test #1: logout admin

Con el fix de arriba, `favorites.spec.ts` y las 3 pruebas de
`shopping-flow.spec.ts` seguían fallando (timeout de 60s completo,
esperando un botón con el primer nombre del admin). Causa: `/admin/*` usa
`AdminLayout` (sidebar propio), no el `Navbar` público con `AccountMenu` --
en `AdminLayout` el logout es un botón solo-ícono con
`title="Cerrar sesión"`, sin texto que matchee el primer nombre. El helper
`logout()` (pensado para el `AccountMenu` público) nunca iba a encontrar ese
botón estando en una ruta admin.

Se agregó `logoutFromAdmin(page)` en `helpers.ts` (usa
`page.getByTitle("Cerrar sesión")`) y se cambiaron los 4 call-sites que
deslogueaban al admin justo después de crear un producto.

## Ronda 5 -- Tres fallas más, tres causas distintas

- **`admin-products.spec.ts` (editar precio)**: el PATCH de edición
  funcionaba bien (confirmado con diagnóstico temporal: 200, precio
  actualizado en la respuesta), pero la tabla seguía mostrando el precio
  viejo. Causa real: `list_products()` devolvía
  `Cache-Control: public, max-age=60` sin distinguir admin de público: el
  browser servía el GET de re-consulta (mismo query string que la búsqueda
  usada al crear el producto) desde caché en vez de pegarle a la red.
  Arreglado devolviendo `no-store` cuando el que pregunta es admin
  (`list_products` y `get_product`), y `public, max-age=...` para el resto.
  Bug real de la app, no del test.

- **`favorites.spec.ts`**: sacar un favorito desde `/cuenta/favoritos` no
  hacía aparecer el estado vacío. Causa real: `useFavorites` era un hook
  plano sin Context -- `FavoritesPage` y cada `ProductCard` llamaban al hook
  por separado, cada uno con su propia copia de `ids`. Sacar el favorito
  desde una tarjeta actualizaba solo esa tarjeta; la página nunca se
  enteraba. Se convirtió en Context compartido (`FavoritesProvider`, mismo
  patrón que `CartProvider`), montado en `main.tsx`. `shared/lib/useFavorites.ts`
  quedó como re-export para no tocar los 3 call-sites existentes. Se
  actualizó también `useFavorites.test.tsx` (unitario, del change
  `frontend-test-coverage` ya archivado) para envolver los `renderHook` con
  el nuevo Provider. Bug real de la app, no del test.

- **`shopping-flow.spec.ts` (checkout sin método de pago)**: el test
  esperaba que al clickear "Confirmar pedido" sin elegir método apareciera
  un mensaje de validación inline. En realidad `CheckoutPage.tsx` deshabilita
  el botón directamente (`disabled={submitting || !paymentMethod}`), así
  que ese click nunca llega a dispararse -- la validación inline en
  `handleConfirm()` es código muerto en la práctica. Se corrigió el test
  para verificar que el botón está deshabilitado, que es el comportamiento
  real (y mejor UX que dejar clickear y mostrar error). Bug del test, no de
  la app.

## Archivos de app tocados (fuera del propio change de E2E)

- `backend/app/api/routes/products.py` -- fix `.op("%%")` → `.op("%")`;
  `Cache-Control: no-store` para requests de admin en `list_products` y
  `get_product`.
- `frontend/src/app/providers/FavoritesProvider.tsx` -- nuevo, Context
  compartido de favoritos.
- `frontend/src/shared/lib/useFavorites.ts` -- ahora re-exporta desde el
  Provider.
- `frontend/src/main.tsx` -- monta `FavoritesProvider`.
- `frontend/src/__tests__/useFavorites.test.tsx` -- `renderHook` con
  wrapper del nuevo Provider.

## Lección del proceso

Cuando el usuario cerró una sesión `--debug` de Playwright a mitad de
camino, pidió explícitamente no volver a correr Playwright de forma
interactiva. A partir de ahí, todo el diagnóstico se hizo con
instrumentación embebida en el código (`console.log`, `waitForResponse`)
corrida vía `npx playwright test --reporter=list` normal, más
`docker compose logs` -- ambos no-interactivos, compatibles con la
restricción, y en la práctica más reproducibles que una sesión de debug
manual.
