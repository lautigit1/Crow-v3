# Design: frontend-tests

## Stack

- **Vitest** — test runner nativo de Vite, compatible con la config existente, sin esfuerzo de setup adicional.
- **@testing-library/react** — renderizado de componentes con simulación de DOM real.
- **@testing-library/user-event** — simula interacciones reales del usuario (clicks, typing).
- **@testing-library/jest-dom** — matchers extra (`toBeInTheDocument`, `toHaveTextContent`, etc.)
- **jsdom** — entorno DOM simulado para los tests (no necesita browser real).
- **msw (Mock Service Worker)** — intercepta requests HTTP y devuelve respuestas mockeadas. Más robusto que mockear axios directamente.

## Configuración

### vite.config.ts

Agregar bloque `test` con environment `jsdom` y setup file para jest-dom matchers.

### vitest.setup.ts

Importa `@testing-library/jest-dom` para extender los matchers de Vitest.

### package.json

Agregar scripts:
```json
"test": "vitest",
"test:run": "vitest run",
"coverage": "vitest run --coverage"
```

## Módulos a testear

### 1. `apiError` — `src/shared/api/client.ts`

Tests unitarios puros, sin mocks:
- Error con `detail` string → devuelve el string
- Error con `detail` array → devuelve `detail[0].msg`
- Error no-axios → devuelve el fallback
- Sin argumento fallback → devuelve "Ocurrió un error"

### 2. `AuthProvider` — `src/app/providers/AuthProvider.tsx`

Tests de integración con MSW mockeando `/api/auth/me`, `/api/auth/login`, `/api/auth/logout`:
- Al montar: llama a `/me`, setea el usuario si responde 200
- Al montar: si `/me` responde 401, `user` queda null y `loading` pasa a false
- `login()`: llama a `/auth/login`, setea el usuario
- `logout()`: limpia el usuario inmediatamente (sin esperar al server)

### 3. Guards — `src/app/router/guards.tsx`

Tests de renderizado con BrowserRouter:
- `RequireAuth`: muestra spinner durante loading → redirige a `/login` si no autenticado → renderiza children si autenticado
- `RequireAdmin`: redirige a `/` si autenticado pero no admin → renderiza children si admin
- `GuestOnly`: redirige a `/cuenta` si autenticado → renderiza children si no autenticado

### 4. Interceptor de refresh — `src/shared/api/client.ts`

Tests con MSW:
- Request 401 → llama a `/auth/refresh` → reintenta el request original
- Request 401 con refresh fallido → propaga el error
- Múltiples requests 401 simultáneos → solo un refresh, todos los requests reintentan

## Estructura de archivos

```
frontend/src/
  __tests__/
    apiError.test.ts
    AuthProvider.test.tsx
    guards.test.tsx
    interceptor.test.ts
  vitest.setup.ts
frontend/
  vite.config.ts    ← agregar bloque test
```
