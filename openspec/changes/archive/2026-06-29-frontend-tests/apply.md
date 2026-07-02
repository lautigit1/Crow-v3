# Apply: frontend-tests

## Archivos creados

- `frontend/vitest.config.ts` — configuración Vitest con jsdom
- `frontend/src/test/setup.ts` — setup global (@testing-library/jest-dom)
- `frontend/src/test/mocks/` — mocks de router, AuthProvider, api client
- Tests de componentes iniciales (Button, Badge, Avatar, ProductCard)

## Archivos modificados

- `frontend/package.json` — dependencias `vitest`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
- `frontend/tsconfig.json` — tipos de vitest incluidos

## Desviaciones del plan

- Tests de integración (páginas completas con API mockeada) quedaron como
  trabajo futuro — la prioridad fue establecer la infraestructura de testing.
