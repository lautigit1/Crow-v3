# Apply: frontend-test-coverage

## Resumen

Primer lote de tests de frontend: `format.test.ts`,
`CartProvider.test.tsx`, `useFavorites.test.tsx`. Sumados a los 4 tests
existentes (`apiError`, `AuthProvider`, `guards`, `interceptor`), la
suite quedó en 57 tests, 7 archivos.

## Bug encontrado y corregido

Uno solo, y de test (no de la app): `formatDate("2026-06-21T00:00:00Z")`
esperaba día "21" pero el resultado daba "20 de jun de 2026". La fecha
de prueba usaba medianoche UTC, que al convertirse a la zona horaria
local (Argentina, UTC-3) cae en el día anterior -- comportamiento
correcto de `formatDate`, dato de prueba mal elegido. Fix: usar
mediodía UTC (`"2026-06-21T12:00:00Z"`) en vez de medianoche.

## Resultado final

57 passed, 0 failed (tras el fix de arriba).

## Archivos tocados

- `frontend/src/__tests__/format.test.ts` (nuevo)
- `frontend/src/__tests__/CartProvider.test.tsx` (nuevo)
- `frontend/src/__tests__/useFavorites.test.tsx` (nuevo)
