# Design: product-images-lazy-cloudinary

## Por qué un helper de string en vez del SDK de Cloudinary

El backend ya evita deliberadamente el SDK oficial de Cloudinary (`app/core/cloudinary_sign.py`, comentario explícito: "keep the dependency footprint small", firma manual vía SHA-1). Se siguió el mismo criterio en el frontend: una transformación de URL de Cloudinary es, literalmente, insertar un segmento de texto entre `/image/upload/` y el resto del path (`f_auto,q_auto,c_fill,w_400,...`) -- no requiere un SDK ni una llamada de red adicional, es manipulación de string pura. Agregar el SDK de Cloudinary al frontend solo para esto sería una dependencia nueva por un beneficio que un helper de 20 líneas ya cubre.

## Detección de URL de Cloudinary

`cloudinaryTransform` solo actúa si la URL contiene `res.cloudinary.com` **y** el segmento `/image/upload/` (no `/video/upload/` ni `/raw/upload/`, que no aceptan las mismas transformaciones de imagen). Cualquier otra URL -- un admin pegando un link externo como logo de marca, por ejemplo, algo que la UI ya permite (`AdminBrandsPage`, campo de texto libre para `logo_url`) -- se devuelve intacta. Esto es deliberado: forzar una transformación de Cloudinary sobre una URL que no es de Cloudinary rompería la imagen por completo.

## Tamaño pedido según contexto, no un valor único

Se relevaron los 6 call-sites reales de `<ProductImage>` (`grep` sobre `frontend/src`) y sus contenedores: tablas de admin (44-56px), carrito/checkout/preview (64-80px), catálogo (grid responsive, tarjetas ~220-400px), y el panel de detalle (contenedor de hasta 440px). En vez de agregar un prop de ancho explícito en cada uno de los 6 call-sites (más invasivo, más superficie de bugs), se reusó el prop `compact` que el componente ya exponía para decidir el layout del tile de reemplazo (ícono + SKU) -- `compact` ya captura exactamente la misma distinción ("miniatura chica" vs. "tile grande") que hace falta acá:

- `compact=true` → se pide `w_240` -- cubre con margen el contenedor más grande en ese modo (80px, carrito) incluso en pantallas retina 2-3x.
- `compact=false` → se pide `w_900` -- cubre el contenedor más grande en ese modo (440px, `ProductDetailPage`) con margen para retina 2x.

`BrandMark` sí tiene un prop `size` numérico exacto ya existente -- ahí se pidió `size * 2` directamente en vez de un valor heurístico, porque el dato preciso ya estaba disponible.

## `priority`: por qué no lazy-loadear todo

`loading="lazy"` en la imagen principal de `ProductDetailPage` sería contraproducente: es casi siempre el elemento más grande del viewport inicial en esa página (candidata directa a Largest Contentful Paint), y lazy-loadear el LCP retrasa exactamente la métrica que se está tratando de mejorar. Se agregó un prop `priority` (default `false`) que cuando es `true` usa `loading="eager"` + `fetchPriority="high"` (hint de prioridad de red del browser, soportado en Chrome/Edge, ignorado silenciosamente donde no aplica). Se activó únicamente en el call-site de `ProductDetailPage` -- los otros 5 (catálogo, carrito, checkout, admin, preview) se quedan con el default lazy, que es lo correcto para listas y miniaturas.

## Verificación

- `npx tsc --noEmit` (frontend sincronizado a disco local, patrón ya establecido en esta sesión por la lentitud del mount de OneDrive) -- 0 errores. Confirma en particular que `fetchPriority` es un atributo JSX válido en la versión de `@types/react` del proyecto.
- `npx eslint .` -- 0 errores (mismos 5 warnings preexistentes no relacionados).
- `npx vitest run src/__tests__` -- 83/83 (76 preexistentes + 7 nuevos de `cloudinaryTransform`: width solo, width+height, height solo, sin ninguno, URL no-Cloudinary intacta, URL de Cloudinary pero no `/image/upload/` (raw/video) intacta, string vacío sin explotar).
- `npm run build` -- build de producción exitoso, sin cambios de tamaño de bundle relevantes (el helper nuevo es trivial en peso).
