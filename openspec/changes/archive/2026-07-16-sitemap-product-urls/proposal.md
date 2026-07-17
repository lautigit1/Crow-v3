# Proposal: sitemap-product-urls

## What

Hallazgo "Alta" #17 de la auditoría técnica del 2026-07-13: `GET /sitemap.xml` (`backend/app/api/routes/seo.py`) incluía las rutas estáticas y una URL por categoría, pero ninguna URL de producto individual (`/producto/{id}`).

## Why

Sin URLs de producto en el sitemap, Google (y cualquier buscador) solo puede descubrir las páginas de detalle de producto siguiendo links internos desde el catálogo -- más lento, y potencialmente incompleto si algún producto no está enlazado prominentemente desde ningún listado indexado. El sitemap es la forma directa y completa de decirle a un buscador "estas son todas las páginas que existen".

## Non-goals

- No se agregó paginación ni límite al sitemap de productos (el endpoint público `GET /api/products` sí pagina, `limit<=100`, pero el sitemap necesita el catálogo completo en una sola respuesta -- es una página XML, no una API paginada).
- No se generó un sitemap index ni se dividió en múltiples archivos -- el volumen actual de productos no lo justifica; si el catálogo creciera a decenas de miles de productos, ahí sí valdría la pena paginar el sitemap en sí (`sitemap-1.xml`, `sitemap-2.xml`, ...).

## Success criteria

- `GET /sitemap.xml` incluye una entrada `<url>` por cada producto no eliminado (`is_deleted = false`), con `<loc>{FRONTEND_URL}/producto/{id}</loc>`, `<lastmod>` real (fecha de `updated_at` del producto, no la fecha de hoy hardcodeada) y `<changefreq>weekly</changefreq>`.
- Los productos eliminados (soft-delete) no aparecen.
- Los productos sin stock sí aparecen (la página de detalle sirve igual, `GET /api/products/{id}` no filtra por stock).
- Se extiende la cobertura de tests ya existente de `seo.py` (`backend/tests/test_seo.py`, de un cambio anterior) con los casos nuevos: incluye producto activo, excluye eliminado, incluye sin stock, valida `lastmod`.
