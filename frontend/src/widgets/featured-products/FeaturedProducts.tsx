import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, SectionHeading, Button, CenteredSpinner, EmptyState } from "@/shared/ui";
import { productApi, type Product } from "@/entities/product";
import { ProductCard } from "@/entities/product/ProductCard";
import { color } from "@/shared/config/theme";
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
      style={{
        background: "#fff",
        padding: "96px 0",
        borderTop: `1px solid ${color.border}`,
        opacity: inView ? 1 : 0,
        animation: inView ? "reveal .6s ease both" : "none",
      }}
    >
      <Container>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 44,
            flexWrap: "wrap",
          }}
        >
          <SectionHeading
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onQuote={onQuote} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
