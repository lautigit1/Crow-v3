# Design: sitemap-product-urls

## Sin límite de resultados, a propósito

El endpoint público `GET /api/products` pagina (`limit` con tope `<=100`, visto en `products.py`) porque sirve a una UI que muestra una página a la vez. El sitemap es distinto: un buscador espera (o al menos acepta mejor) recibir el listado completo de URLs en una sola respuesta XML. Por eso la query de productos en `seo.py` no reutiliza el endpoint de la API ni su límite -- hace un `select(Product.id, Product.updated_at)` directo, igual que ya hacía el bloque de categorías existente (`select(Category.name)`, tampoco paginado).

## Por qué se incluyen productos sin stock

Se verificó primero cómo se comporta `GET /api/products/{id}` (`get_product` en `products.py`): filtra únicamente por `Product.is_deleted.is_(False)`, sin ningún filtro de `stock`. Es decir, la página de detalle de un producto agotado sigue existiendo y sirviendo contenido real (probablemente con un estado de "sin stock" en la UI, pero la URL es válida y indexable). Excluir productos sin stock del sitemap hubiera sido inconsistente con lo que la API realmente sirve -- se decidió incluir todos los no eliminados, sin mirar `stock`.

## `lastmod` real en vez de la fecha de hoy

Las entradas de categoría del sitemap (código preexistente) usan `today = str(date.today())` como `lastmod` porque `Category` no trackea cuándo cambió por última vez. `Product` sí tiene `updated_at` (con `onupdate=func.now()`), así que las entradas de producto usan `updated_at.date()` real -- le da a los buscadores una señal más precisa de qué productos cambiaron recientemente y podrían necesitar un re-crawl, en vez de que todas las URLs aparenten haberse actualizado "hoy" en cada request al sitemap (lo cual sería literalmente falso y le resta valor a la señal `lastmod`).

## Prioridad relativa

Se usó `priority=0.6` para productos, más baja que las rutas estáticas (`1.0` home, `0.8` el resto) y que las páginas de categoría (`0.7`, código preexistente) -- es una jerarquía deliberada: home > secciones principales > categorías > productos individuales, reflejando que un buscador debería priorizar recrawlear las páginas de listado (que cambian más seguido, con más productos nuevos/stock) sobre una página de producto individual específica. `priority` en el protocolo de sitemaps es solo una sugerencia (no todos los buscadores la usan), pero mantener la jerarquía es consistente con lo que ya existía.

## Tests: se extendió el archivo existente, no se creó uno nuevo

Al ir a agregar tests, se encontró que `backend/tests/test_seo.py` ya existía (de un cambio de sesión anterior, con cobertura de rutas estáticas, categorías activas/eliminadas y robots.txt) -- se agregaron los 4 casos nuevos de producto a la clase `TestSitemap` ya existente, siguiendo el mismo estilo (`self, client, <fixture>`), en vez de duplicar un archivo paralelo.

## Verificación

- `python3 -m pytest tests/test_seo.py -q` -- 8/8 (4 preexistentes + 4 nuevos de producto).
- `python3 -m ruff check .` (vía `python3 -m ruff`, el binario `ruff` no está en el PATH de este sandbox pero el paquete sí está instalado) -- "All checks passed!".
- Suite completa de backend corrida en 4 tandas (por el límite de 45s por llamada de este entorno): 249/249 tests pasando, sin regresiones en ningún otro módulo.
