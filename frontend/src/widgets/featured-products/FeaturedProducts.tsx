import { Link } from "react-router-dom";
import { Container, SectionHeading, Button, CenteredSpinner, EmptyState } from "@/shared/ui";
import { type Product } from "@/entities/product";
import { useProductsQuery } from "@/entities/product/queries";
import { ProductCard } from "@/entities/product/ProductCard";
import { useInView } from "@/shared/lib/useInView";

const FEATURED_PARAMS = { featured: true, limit: 8 };

export function FeaturedProducts({ onQuote }: { onQuote: (p: Product) => void }) {
  const { data, isPending } = useProductsQuery(FEATURED_PARAMS);
  const products = data?.items;
  const [ref, inView] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-ink900 py-24"
      style={{ opacity: inView ? 1 : 0, animation: inView ? "reveal .6s ease both" : "none" }}
    >
      {/* Mismo glow sutil que StatsSection/HowItWorks, para que las 3
          secciones oscuras compartan lenguaje */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_500px_at_20%_0%,rgba(0,87,217,.14),transparent_60%)]" />

      <Container className="relative">
        <div className="flex items-end justify-between gap-6 mb-11 flex-wrap">
          <SectionHeading
            dark
            eyebrow="PRODUCTOS DESTACADOS"
            title="Lo que más rota en nuestro mostrador"
            subtitle="Stock actualizado a diario. Solicita cotización del producto que necesites."
          />
          <Button as={Link} to="/catalogo" variant="outline">
            Ver catálogo completo <span>→</span>
          </Button>
        </div>

        {isPending ? (
          <CenteredSpinner label="Cargando productos…" />
        ) : !products || products.length === 0 ? (
          <EmptyState
            title="Aún no hay productos destacados"
            message="Marca productos como destacados desde el panel de administración."
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
            {/* `grid-cols-4` fijo dejaba tarjetas de ~230px en un portátil de
                1280px y de ~180px en una tablet, sin punto de quiebre: la card
                nueva no entra ahí. Con `auto-fill` la home usa el mismo mínimo
                que el catálogo y baja sola a 3 o 2 columnas. */}
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onQuote={onQuote} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
