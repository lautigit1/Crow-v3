import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading, Button, CenteredSpinner, EmptyState } from "@/shared/ui";
import { productApi, type Product } from "@/entities/product";
import { ProductCard } from "@/entities/product/ProductCard";
import { useInView } from "@/shared/lib/useInView";

export function FeaturedProducts({ onQuote }: { onQuote: (p: Product) => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [ref, inView] = useInView();

  useEffect(() => {
    productApi
      .list({ featured: true, limit: 8 })
      .then((r) => setProducts(r.items))
      .catch(() => setProducts([]));
  }, []);

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

        {products === null ? (
          <CenteredSpinner label="Cargando productos…" />
        ) : products.length === 0 ? (
          <EmptyState
            title="Aún no hay productos destacados"
            message="Marca productos como destacados desde el panel de administración."
          />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onQuote={onQuote} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
