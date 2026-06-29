# Proposal: confirm-modal

## What

Reemplazar los 5 usos de `window.confirm()` en el panel admin por un componente `ConfirmModal` reutilizable, estilizado con el sistema de diseño existente.

## Why

`window.confirm()` es un diálogo nativo del browser que:
- Bloquea el hilo principal (JavaScript se pausa hasta que el usuario responde)
- No es customizable visualmente — rompe la coherencia del diseño
- Está deprecado en contextos modernos y puede ser bloqueado por algunos browsers
- No permite HTML en el mensaje (los `\n` no se renderizan como saltos de línea reales en todos los browsers)

Afecta a: AdminProductsPage, AdminSuppliersPage, AdminCategoriesPage, AdminBrandsPage, AdminUsersPage.

## Success criteria

- Cero llamadas a `window.confirm()` o `confirm()` en el panel admin.
- El `ConfirmModal` es reutilizable desde cualquier página con una API simple de estado.
- Muestra el nombre del elemento a eliminar y un mensaje de advertencia personalizable.
- El botón de confirmación es rojo (variant danger) para reforzar la destructividad.
- Se puede cerrar con Escape o click en el backdrop.
