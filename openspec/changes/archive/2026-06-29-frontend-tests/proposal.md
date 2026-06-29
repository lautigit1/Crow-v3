# Proposal: frontend-tests

## What

Agregar testing de frontend con Vitest + Testing Library, cubriendo los componentes y módulos más críticos del sistema: AuthProvider, guards de rutas, el helper `apiError`, y los tests de integración del interceptor de axios.

## Why

El frontend tiene cero tests. La lógica de autenticación (AuthProvider, guards, interceptor de refresh) es el núcleo del sistema de seguridad del cliente. Cualquier refactoring de esos módulos sin tests es un riesgo directo.

Los tests de frontend también son el gate más rápido en CI: detectan regresiones en segundos, sin necesitar la base de datos ni el servidor.

## Non-goals

- No se testean todos los componentes UI (Button, Modal, DataTable) — son mayormente presentacionales.
- No se implementan tests E2E (Playwright) en este change.
- No se alcanza el 100% de cobertura — el foco es en los módulos de mayor riesgo.

## Success criteria

- `npm test` corre todos los tests y pasa.
- `npm run coverage` genera un reporte de cobertura.
- Tests cubren: AuthProvider (mount, login, logout), guards (RequireAuth, RequireAdmin, GuestOnly), `apiError` helper, y el interceptor de refresh de axios.
- El workflow de CI de GitHub Actions incluye los tests de frontend.
