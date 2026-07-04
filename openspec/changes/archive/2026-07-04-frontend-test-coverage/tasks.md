# Tasks: frontend-test-coverage

- [x] T1 — `src/__tests__/format.test.ts`
- [x] T2 — `src/__tests__/CartProvider.test.tsx`
- [x] T3 — `src/__tests__/useFavorites.test.tsx`
- [x] T4 — Usuario corre `npm run test:run` y comparte resultado (56
      passed, 1 failed en la primera corrida).
- [x] T5 — Corregir lo que falle, archivar el change.

## T4 — resultado de la primera corrida

56 passed, 1 failed: `formatDate` esperaba día "21" pero recibió "20".
Bug del test, no de `format.ts` -- usaba `"2026-06-21T00:00:00Z"`
(medianoche UTC), que al convertir a la zona horaria local (Argentina,
UTC-3) cae en el día anterior. Fix: usar mediodía UTC
(`"2026-06-21T12:00:00Z"`), que cae en el mismo día para cualquier
huso horario razonable.

`CartProvider.test.tsx` y `useFavorites.test.tsx` pasaron limpio en la
primera corrida.
