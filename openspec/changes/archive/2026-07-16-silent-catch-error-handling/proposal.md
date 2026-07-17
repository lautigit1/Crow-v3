# Proposal: silent-catch-error-handling

## What

Hallazgo "Alta" #14 de la auditoría técnica del 2026-07-13: patrones de `.catch(() => setX([]))` en el frontend que silenciaban cualquier error (red caída, 500, timeout) mostrando simplemente una lista vacía, indistinguible de "genuinamente no hay datos".

## Why

Un admin viendo "No hay usuarios." o "No hay proveedores registrados." no tiene forma de saber si eso es cierto o si la llamada a la API falló. Sin logging, tampoco queda rastro en la consola del navegador para debuggear un reporte de "se rompió la página X". Este patrón estaba en 13 archivos / 19 sitios `.catch(...)` reales (el número de la auditoría, 27, incluía además varios casos que la migración a TanStack Query de un cambio anterior de esta misma sesión ya había resuelto).

## Non-goals

- No se introdujo un sistema de toasts/notificaciones global (no existía y agregarlo es una decisión de UI más grande que este hallazgo puntual) — se reusó el patrón visible que la app ya tenía (mensaje de error inline, con acción de reintentar cuando aplica).
- Los 2 `.catch` de `entities/session/context.tsx` (chequeo de sesión al montar, logout fire-and-forget) se mantienen silenciosos para el caso esperado (401 = no hay sesión), pero ahora loguean cualquier error inesperado -- no se convirtieron en errores visibles porque bloquear la UI por un fallo de "restaurar sesión" sería peor UX que simplemente tratar al usuario como no autenticado.

## Success criteria

- Los 19 sitios `.catch` silenciosos originales ahora loguean el error real vía `console.error` con contexto (qué componente, qué se intentaba cargar).
- Para listas donde toda la página depende de una sola carga (auditoría, marcas, categorías, inventario, cotizaciones, proveedores, usuarios, productos, mis cotizaciones), el mensaje de "vacío" distingue explícitamente el caso de error del caso de "no hay registros", y donde ya existía un flujo de reintento manual (botón "Reintentar" o reload de página) se preserva.
- Para widgets secundarios que no deberían tumbar toda la página si fallan (selects de filtro en Productos, widgets de stock bajo/auditoría reciente en el Dashboard), se loguea el error y el widget queda en un estado vacío degradado, sin romper el resto de la página.
- `tsc --noEmit`, `eslint .` (0 errores), `npm run build`, y la suite de Vitest afectada siguen pasando después del cambio.
