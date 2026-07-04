# Proposal: frontend-test-coverage

## What

Primer lote de tests de frontend, siguiendo con lo acordado tras cerrar
backend (cobertura completa + E2E, arrancando por backend primero). El
proyecto ya tenía infraestructura de testing armada (Vitest +
Testing Library + MSW, con 4 archivos existentes: `apiError`,
`AuthProvider`, `guards`, `interceptor`) pero sin cubrir todavía la
lógica de negocio más importante del lado del cliente.

Se agregan 3 archivos nuevos:

- `format.test.ts` — funciones puras de `shared/lib/format.ts`
  (`formatPrice`, `formatNumber`, `formatDate`, `formatDateTime`).
- `CartProvider.test.tsx` — el provider más complejo del frontend:
  agregar/quitar/cambiar cantidad, tope por stock, subtotal, y sobre
  todo la reconciliación de carrito invitado↔usuario en login/logout
  (particionado de `localStorage` por sesión).
- `useFavorites.test.tsx` — el hook de favoritos: fetch al montar,
  no-op sin sesión, toggle optimista con reversión si la API falla.

## Why

Pedido del usuario: cobertura completa de tests + E2E, arrancando por
backend (ya cerrado, ver `archive/2026-07-04-backend-test-coverage`).
Este change es el primer paso del lado frontend, elegido explícitamente
por el usuario en vez de arrancar por E2E.

## Alcance

- Mismo estilo que los tests existentes: `describe`/`it` en español,
  MSW cuando hace falta red, `vi.mock` para aislar dependencias
  puntuales (acá: `useAuth`, `favoriteApi`) en vez de un
  `AuthProvider` real -- más simple y determinístico para lógica que
  solo lee `user`/`loading`.

## Non-goals

- No se tocan los 4 archivos de test ya existentes.
- No se cubren páginas completas (`CheckoutPage`, `AdminProductsPage`,
  etc.) en este change -- queda para un próximo lote si el usuario
  quiere seguir profundizando en frontend antes de pasar a E2E.
- No se arranca Playwright/E2E todavía (decisión explícita del
  usuario: frontend primero).
