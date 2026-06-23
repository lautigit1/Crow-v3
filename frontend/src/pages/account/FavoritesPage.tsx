import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button } from "@/shared/ui";
import { useFavorites } from "@/shared/lib/useFavorites";
import { productApi, type Product } from "@/entities/product";
import { ProductCard } from "@/entities/product/ProductCard";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { color, font } from "@/shared/config/theme";

export function FavoritesPage() {
  const { ids } = useFavorites();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({ open: false, message: "", productId: null });

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    setProducts(null);
    Promise.all(ids.map((id) => productApi.get(id).catch(() => null)))
      .then((list) => setProducts(list.filter((p): p is Product => p !== null)))
      .catch(() => setProducts([]));
  }, [ids]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>Favoritos</h1>

      {products === null ? (
        <CenteredSpinner label="Cargando favoritos…" />
      ) : products.length === 0 ? (
        <EmptyState
          title="No tenés favoritos todavía"
          message="Tocá el corazón en cualquier producto del catálogo para guardarlo acá."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onQuote={(prod) => setModal({ open: true, message: `Producto: ${prod.name} (SKU ${prod.sku})`, productId: prod.id })} />
          ))}
        </div>
      )}

      <QuoteModal open={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} initialMessage={modal.message} productId={modal.productId} />
    </div>
  );
}
