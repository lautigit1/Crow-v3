# Apply: product-images-lazy-cloudinary

## Resumen

`ProductImage`/`BrandMark` ahora piden a Cloudinary un tamaño acorde al contexto (`f_auto,q_auto` + ancho) en vez del archivo original completo, y cargan `loading="lazy"` por default -- excepto la imagen principal de `ProductDetailPage`, que carga eager con prioridad alta por ser candidata a LCP. Hallazgo "Alta" #18 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `frontend/src/shared/lib/cloudinaryUrl.ts` (nuevo)
- `frontend/src/shared/ui/ProductImage.tsx`
- `frontend/src/pages/product/ProductDetailPage.tsx`
- `frontend/src/__tests__/cloudinaryUrl.test.ts` (nuevo)

## Decisiones documentadas

- Helper de manipulación de string en vez del SDK de Cloudinary -- mismo criterio ya usado en el backend (`cloudinary_sign.py`) para mantener el footprint de dependencias chico.
- Ancho pedido a Cloudinary derivado del prop `compact` ya existente (240px miniaturas, 900px tiles grandes) en vez de agregar un prop nuevo en cada uno de los 6 call-sites -- menos invasivo, mismo resultado práctico.
- `BrandMark` usa su prop `size` exacto ×2 (retina) en vez de un valor heurístico, porque ahí sí hay un dato preciso disponible.
- Nuevo prop `priority` en `ProductImage` (default `false` = lazy) para poder marcar explícitamente la única imagen que es candidata real a LCP (`ProductDetailPage`) sin volver eager todo lo demás.
- URLs que no son de Cloudinary (ej. un logo de marca externo pegado a mano) se devuelven intactas -- no se fuerza Cloudinary sobre algo que no lo es.

## Verificación

- `npx tsc --noEmit` -- 0 errores.
- `npx eslint .` -- 0 errores.
- `npx vitest run src/__tests__` -- 83/83 (76 preexistentes + 7 nuevos).
- `npm run build` -- build de producción exitoso.

## Pendiente / limitaciones

- No se implementó `srcset`/`<picture>` con múltiples resoluciones -- un único ancho fijo por contexto (vía Cloudinary `c_fill`/`c_limit`) cubre la mayor parte del beneficio con mucha menos complejidad. Si en el futuro se necesita afinar más (ej. imágenes de catálogo en pantallas muy anchas), `srcset` real sería el siguiente paso natural sobre esta misma base.
