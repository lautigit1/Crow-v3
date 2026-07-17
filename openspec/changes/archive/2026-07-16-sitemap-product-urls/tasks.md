# Tasks: sitemap-product-urls

- [x] **T1** — Leer `backend/app/api/routes/seo.py` para entender la generación actual del sitemap
- [x] **T2** — Confirmar la ruta real del frontend para el detalle de producto (`frontend/src/app/App.tsx`, `/producto/:id`)
- [x] **T3** — Revisar `Product` model para confirmar campos disponibles (`id`, `is_deleted`, `updated_at`)
- [x] **T4** — Revisar `get_product` en `products.py` para confirmar que no filtra por `stock` (justifica incluir productos agotados)
- [x] **T5** — Agregar el bloque de URLs de producto a `sitemap()`: query directa sin paginar, `lastmod` real desde `updated_at`, `changefreq=weekly`, `priority=0.6`
- [x] **T6** — Encontrar que ya existía `backend/tests/test_seo.py` de un cambio anterior de esta sesión (en vez de asumir que no había cobertura)
- [x] **T7** — Agregar 4 tests nuevos a `TestSitemap`: producto activo incluido, producto eliminado excluido, producto sin stock incluido, `lastmod` presente
- [x] **T8** — `python3 -m pytest tests/test_seo.py -q` -- 8/8
- [x] **T9** — `python3 -m ruff check .` -- 0 errores
- [x] **T10** — Suite completa de backend en 4 tandas -- 249/249
