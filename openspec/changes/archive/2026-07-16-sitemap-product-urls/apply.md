# Apply: sitemap-product-urls

## Resumen

`GET /sitemap.xml` ahora incluye una URL por cada producto activo (`/producto/{id}`), con `lastmod` real basado en `updated_at`. Hallazgo "Alta" #17 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `backend/app/api/routes/seo.py`
- `backend/tests/test_seo.py`

## Decisiones documentadas

- Sin límite/paginación en la query de productos del sitemap (a diferencia del endpoint público `GET /api/products`) -- un sitemap necesita el listado completo en una sola respuesta.
- Se incluyen productos sin stock -- `GET /api/products/{id}` no los excluye, así que la URL sigue siendo válida.
- `lastmod` usa `Product.updated_at` real en vez de la fecha de hoy hardcodeada (que sí se sigue usando para categorías, que no trackean su última modificación).
- `priority=0.6` para productos, por debajo de rutas estáticas (0.8-1.0) y categorías (0.7) -- jerarquía deliberada de qué debería recrawlearse con más frecuencia.
- Los tests nuevos se agregaron a `backend/tests/test_seo.py`, que ya existía de un cambio anterior de esta sesión con cobertura de rutas estáticas/categorías/robots.txt -- se extendió en vez de duplicar.

## Verificación

- `python3 -m pytest tests/test_seo.py -q` -- 8/8 (4 preexistentes + 4 nuevos).
- `python3 -m ruff check .` -- 0 errores.
- Suite completa de backend (4 tandas de ≤45s por el límite de este entorno) -- 249/249 tests pasando.

## Pendiente / limitaciones

- No se generó un sitemap index ni se paginó el XML en sí -- si el catálogo creciera masivamente (decenas de miles de productos), un único `sitemap.xml` con todo podría necesitar dividirse. No se justifica con el volumen actual.
