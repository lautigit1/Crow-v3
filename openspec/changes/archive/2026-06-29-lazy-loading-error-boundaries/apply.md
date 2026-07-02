# Apply: lazy-loading-error-boundaries

## Archivos creados

- `frontend/src/shared/ui/AnimatedOutlet.tsx` — wrapper con animación de transición
- `frontend/src/app/providers/ErrorBoundary.tsx` — Error Boundary de clase React

## Archivos modificados

- `frontend/src/app/router/index.tsx` — todas las rutas usan `React.lazy()` +
  `<Suspense fallback={<CenteredSpinner />}>`
- `frontend/src/app/App.tsx` — `<ErrorBoundary>` envuelve el árbol principal

## Comportamiento implementado

- Cada ruta se carga como chunk separado en el build de Vite.
- Si un componente rompe en runtime, el Error Boundary muestra la pantalla
  "Algo salió mal" con el mensaje de error y botones Reintentar / Recargar.
- El spinner de carga aparece durante la descarga del chunk de cada ruta.

## Desviaciones del plan

Ninguna.
