# Tasks: product-images-lazy-cloudinary

- [x] **T1** — Leer `frontend/src/shared/ui/ProductImage.tsx` (ambos componentes: `ProductImage` y `BrandMark`)
- [x] **T2** — Revisar cómo se generan las URLs de Cloudinary en el backend (`app/core/cloudinary_sign.py`) para confirmar el formato real (`res.cloudinary.com/.../image/upload/...`)
- [x] **T3** — `grep` los 6 call-sites reales de `<ProductImage>` y sus contenedores (admin tablas, carrito, checkout, catálogo, detalle) para dimensionar los anchos a pedir
- [x] **T4** — Crear `frontend/src/shared/lib/cloudinaryUrl.ts` (`cloudinaryTransform`): inserta `f_auto,q_auto` + `c_fill`/`c_limit` + `w_`/`h_` solo si la URL es de Cloudinary con `/image/upload/`; intacta en cualquier otro caso
- [x] **T5** — `ProductImage`: aplicar `cloudinaryTransform` (ancho según `compact`), agregar `loading`/`decoding`/`fetchPriority` según nuevo prop `priority`
- [x] **T6** — `BrandMark`: aplicar `cloudinaryTransform` (ancho = `size * 2`), agregar `loading="lazy"`/`decoding="async"`
- [x] **T7** — `ProductDetailPage.tsx`: pasar `priority` en el único call-site que corresponde (imagen principal, candidata a LCP)
- [x] **T8** — Crear `frontend/src/__tests__/cloudinaryUrl.test.ts` con 7 casos (width, width+height, height, sin ninguno, no-Cloudinary, Cloudinary-pero-no-image-upload, string vacío)
- [x] **T9** — `npx tsc --noEmit` sobre copia local sincronizada -- 0 errores
- [x] **T10** — `npx eslint .` -- 0 errores
- [x] **T11** — `npx vitest run src/__tests__` -- 83/83
- [x] **T12** — `npm run build` -- build de producción exitoso
