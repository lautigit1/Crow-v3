# Proposal: lazy-loading-error-boundaries

## What

Agregar code splitting con `React.lazy` en las rutas del panel admin y de cuenta, e implementar Error Boundaries para que un crash en un componente no derribe toda la aplicación.

## Why

Actualmente todos los imports de páginas en `App.tsx` son estáticos. El bundle inicial incluye el código del panel admin completo (11 páginas), las páginas de cuenta (5 páginas) y las páginas legales, aunque el visitante típico del sitio público nunca los usa.

Con lazy loading:
- El bundle inicial se reduce ~40%, mejorando el Time to Interactive del catálogo público.
- Cada sección se descarga solo cuando el usuario navega a ella.

Con Error Boundaries:
- Un error en el panel admin no rompe el catálogo público.
- El usuario ve una UI de fallback en lugar de una pantalla en blanco.

## Non-goals

- No se migra el sistema de estilos (sigue siendo inline styles).
- No se agregan animaciones de transición entre rutas.

## Success criteria

- Las páginas admin se cargan como chunks separados en el build (`vite build` muestra múltiples JS chunks).
- Un error deliberado en un componente muestra el fallback de ErrorBoundary en lugar de pantalla blanca.
- Las páginas públicas (HomePage, CatalogPage) siguen siendo eager — sin degradación para el visitante anónimo.
