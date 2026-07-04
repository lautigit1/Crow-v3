# Design: product-detail-page

## 1. Seed de prueba (`backend/app/seed.py`)

Idempotente: solo corre si **no hay ningún producto** en la tabla todavía
(no pisa catálogos reales). Crea (si no existen) una categoría "Filtros" y
una marca "Bosch" por `slug`, y un producto de ejemplo con imagen real
(placeholder estable de `picsum.photos`, ya que Cloudinary no tiene
credenciales reales configuradas todavía).

```python
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product

def seed(db: Session) -> None:
    # ... seed de admin existente, sin cambios ...

    if not db.scalar(select(Product).limit(1)):
        category = db.scalar(select(Category).where(Category.slug == "filtros"))
        if not category:
            category = Category(name="Filtros", slug="filtros", description="Filtros de aceite, aire, combustible y cabina.")
            db.add(category)
            db.flush()

        brand = db.scalar(select(Brand).where(Brand.slug == "bosch"))
        if not brand:
            brand = Brand(name="Bosch", slug="bosch")
            db.add(brand)
            db.flush()

        db.add(Product(
            name="Filtro de Aceite Bosch Premium",
            sku="FILT-BOS-001",
            description="...",
            price=8500,
            stock=24,
            image_url="https://picsum.photos/seed/crow-filtro-bosch/800/800",
            vehicle_type="Autos",
            is_featured=True,
            category_id=category.id,
            brand_id=brand.id,
        ))
        db.commit()
        print("✓ Producto de prueba creado: Filtro de Aceite Bosch Premium")
    else:
        print("→ Ya hay productos cargados, no se crea el producto de prueba")
```

Corre automáticamente: el `Dockerfile` ya ejecuta `python -m app.seed` antes
de levantar uvicorn (`CMD ["sh", "-c", "python -m app.seed && uvicorn ..."]`).
También corre manualmente con `python -m app.seed` (documentado en el README
del backend, sección "Correr sin Docker").

---

## 2. Página de detalle (`frontend/src/pages/product/ProductDetailPage.tsx`, nueva)

Fetch por `id` de la URL (`useParams`), estados: `undefined` (cargando),
`null` (no encontrado/404), `Product` (ok).

Layout de 2 columnas en desktop (imagen | info), 1 columna en mobile
(`useBreakpoint`, mismo patrón que `CatalogPage`). Sin hero oscuro — a
diferencia del catálogo, esta página es deliberadamente más minimalista:
fondo claro, breadcrumb chico, mucho aire.

```
Inicio / Catálogo / <Nombre>          (breadcrumb mono, chico)

┌──────────────┐   Categoría · SKU
│              │   Nombre del producto (grande, font.display)
│   Imagen     │   Marca
│   (1:1)      │   ⭐ favorito (esquina, mismo patrón que ProductCard)
│              │
└──────────────┘   $ Precio (grande)
                    [Badge de stock]  [Tipo de vehículo]

                    Descripción (párrafo, si existe)

                    [Cotizar]  [WhatsApp: Consultar]
```

Reutiliza: `ProductImage`, `Badge`, `Button`, `Icon`, `Container`,
`CenteredSpinner`, `EmptyState`, `QuoteModal`, `useFavorites`, `waLink`,
`formatPrice`, `usePageMeta`. No se crean componentes de UI nuevos.

Estado "no encontrado":
```tsx
<Container style={{ padding: "80px 16px" }}>
  <EmptyState
    title="Producto no encontrado"
    message="Puede que ya no esté disponible o el link sea incorrecto."
    action={<Button onClick={() => navigate("/catalogo")}>Volver al catálogo</Button>}
  />
</Container>
```

---

## 3. Ruta (`frontend/src/app/App.tsx`)

Se agrega `/producto/:id` como ruta pública **eager** (no lazy) — es un
punto de entrada primario del catálogo, igual criterio que `CatalogPage`
(que también es eager). Va dentro del mismo `<Route element={<PublicLayout />}>`.

```tsx
import { ProductDetailPage } from "@/pages/product/ProductDetailPage";
// ...
<Route path="/producto/:id" element={<ProductDetailPage />} />
```

---

## 4. `ProductCard.tsx` — hacerla clickeable sin romper los botones existentes

Para no anidar `<button>` dentro de `<a>` (HTML inválido, rompe accesibilidad),
se envuelven en `<Link>` solo los bloques que **no** contienen botones:

- El bloque de imagen: se envuelve únicamente el `<ProductImage>` en un
  `<Link to={...}>` — el badge de stock y el botón de favorito quedan como
  hermanos absolutamente posicionados en el mismo contenedor `relative`
  (igual que hoy), por lo que siguen funcionando de forma independiente.
- El bloque de contenido (categoría/SKU/nombre/marca/precio): el `<div>`
  contenedor pasa a ser un `<Link>` con los mismos estilos — no contiene
  botones, así que no hay conflicto.
- El footer de acciones (Cotizar / WhatsApp) **no se toca** — sigue fuera
  de cualquier `Link`.

```tsx
import { Link } from "react-router-dom";
// ...
const to = `/producto/${product.id}`;

<div style={{ position: "relative" }}>
  <Link to={to} style={{ display: "block" }}>
    <ProductImage ... />
  </Link>
  <span badge... />       {/* hermano, sin cambios */}
  <button favorito... />  {/* hermano, sin cambios */}
</div>

<Link to={to} style={{ padding: "14px 14px 0", flex: 1, display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}>
  {/* meta row, nombre, marca, precio — contenido sin cambios */}
</Link>
```
