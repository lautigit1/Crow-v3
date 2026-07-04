# Apply: product-detail-page

## Archivos modificados/creados

### Backend
- `backend/app/seed.py` — refactorizado en `_seed_admin()` + `_seed_demo_product()`.
  El segundo crea categoría "Filtros", marca "Bosch" y un producto
  "Filtro de Aceite Bosch Premium" (con imagen de `picsum.photos`, ya que
  Cloudinary aún no tiene credenciales reales), **solo si la tabla
  `products` está vacía**. Corre automáticamente vía el `CMD` del
  Dockerfile (`python -m app.seed && uvicorn ...`) o manualmente con
  `python -m app.seed`.

### Frontend
- `frontend/src/pages/product/ProductDetailPage.tsx` (nuevo) — página
  pública de detalle: imagen grande + info (categoría, SKU, nombre, marca,
  precio, badges de stock/vehículo, descripción, Cotizar/WhatsApp/Favorito).
  Maneja 3 estados: cargando, no encontrado (`EmptyState` con link a
  `/catalogo`), y producto encontrado.
- `frontend/src/app/App.tsx` — ruta `/producto/:id` (eager, mismo criterio
  que `/catalogo`).
- `frontend/src/entities/product/ProductCard.tsx` — la imagen y el bloque
  de contenido (categoría/SKU/nombre/marca/precio) ahora son `<Link>` a
  `/producto/:id`. El badge de stock, el botón de favorito y el footer de
  acciones (Cotizar/WhatsApp) quedan fuera de cualquier `Link`, sin cambios
  de comportamiento, para no anidar `<button>` dentro de `<a>`.

## Verificación

- Lectura completa de cada archivo modificado/creado.
- Se detectó y corrigió un bug propio durante la revisión: el `Container`
  de la sección principal de `ProductDetailPage.tsx` tenía
  `padding: isMobile ? "20px 0 60px" : "32px 0 96px"` — el shorthand de
  3 valores pone el padding lateral en `0`, pegando el contenido a los
  bordes de la pantalla. Se corrigió a `"20px 16px 60px"` / `"32px 40px 96px"`
  (mismo patrón que ya usa `CatalogPage.tsx`).
- No se pudo correr `tsc --noEmit` ni ver la página renderizada (sin
  `node_modules` instalado en este sandbox) — recomiendo correr
  `npm run typecheck` y abrir `/producto/1` en el navegador antes de dar
  por cerrado esto.

## Cómo probarlo

1. Si es la primera vez que se levanta el proyecto (o la tabla `products`
   está vacía), el seed crea automáticamente el producto de prueba.
2. Entrar a `/catalogo`, click en la imagen o el nombre de cualquier
   producto → navega a `/producto/:id`.
3. Probar con un `id` inexistente (ej. `/producto/99999`) → debe mostrar
   "Producto no encontrado" con link de vuelta al catálogo.

## Desviaciones del plan

- Ninguna relevante, salvo el fix de padding mencionado arriba (detectado
  en la propia verificación, no un cambio de alcance).
