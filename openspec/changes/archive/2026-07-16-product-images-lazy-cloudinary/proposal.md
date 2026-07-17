# Proposal: product-images-lazy-cloudinary

## What

Hallazgo "Alta" #18 de la auditoría técnica del 2026-07-13: las imágenes de producto (y de marca) se servían tal cual las devolvía Cloudinary al momento del upload -- tamaño completo del archivo original, sin `loading="lazy"`, sin importar que se estén mostrando en una miniatura de 44px en una tabla de admin.

## Why

Dos problemas de performance combinados: (1) el navegador descarga *todas* las imágenes de la página apenas se resuelve el DOM, incluso las que están fuera del viewport (catálogo con decenas de productos, la mayoría nunca llega a verse); (2) cada imagen pesa lo mismo esté en una miniatura de 44px o en la página de detalle a 440px, porque nunca se le pidió a Cloudinary una versión más chica. Ambos afectan directamente Core Web Vitals (LCP, y el peso total de la página en conexiones lentas) y el costo de banda de Cloudinary.

## Non-goals

- No se migró a un componente `<picture>`/`srcset` con múltiples resoluciones -- Cloudinary con `f_auto,q_auto` + un ancho fijo por contexto ya cubre la mayoría del beneficio con mucho menos complejidad. `srcset` real queda como mejora futura si hiciera falta.
- No se tocaron imágenes que no son de Cloudinary (logo estático del sitio en `Hero.tsx`, que además está por encima del pliegue y no debería ser lazy).
- El helper de transformación (`cloudinaryTransform`) devuelve intacta cualquier URL que no sea de Cloudinary (un admin puede pegar cualquier URL externa como logo de marca) -- no se fuerza el uso de Cloudinary.

## Success criteria

- `ProductImage` (usado en catálogo, carrito, checkout, admin, panel de detalle) pide a Cloudinary un ancho acorde al contexto (`compact` vs. no) con `f_auto,q_auto` (formato y calidad automáticos) en vez de servir el archivo original.
- Todas las imágenes de producto/marca usan `loading="lazy"` y `decoding="async"`, **excepto** la imagen principal de `ProductDetailPage` (candidata a LCP), que usa `loading="eager"` + `fetchPriority="high"` vía un nuevo prop `priority`.
- URLs que no son de Cloudinary se devuelven intactas, sin romperse.
- Tests unitarios nuevos para el helper de transformación.
- `tsc --noEmit`, `eslint .` (0 errores), `npm run build`, y la suite de Vitest siguen pasando.
