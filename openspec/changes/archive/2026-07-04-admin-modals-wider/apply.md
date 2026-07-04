# Apply: admin-modals-wider

## Archivos tocados

- `frontend/src/pages/admin/AdminProductsPage.tsx` (`width={600}` → `width={760}`)
- `frontend/src/pages/admin/AdminSuppliersPage.tsx` (`width={520}` → `width={640}`)
- `frontend/src/pages/admin/AdminUsersPage.tsx` (`width={480}` → `width={600}`)
- `frontend/src/pages/admin/AdminCategoriesPage.tsx` (`width={440}` → `width={560}`)
- `frontend/src/pages/admin/AdminBrandsPage.tsx` (`width={440}` → `width={560}`)

Cambio puramente numérico en el prop `width` del componente `Modal`
compartido -- ningún otro archivo ni componente se modificó.

## Verificación

Sandbox sin red -- no se pudo correr `tsc`/build. Verificado con grep
que los 5 archivos quedaron con el ancho correcto y no hay sintaxis
rota alrededor del prop.
