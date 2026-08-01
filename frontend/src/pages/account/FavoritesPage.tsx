import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button, Icon } from "@/shared/ui";
import { useFavorites } from "@/shared/lib/useFavorites";
import { ProductCard } from "@/entities/product/ProductCard";
import { type Product } from "@/entities/product";
import { useProductsByIdsQuery } from "@/entities/product/queries";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { AccountPageHeader } from "./ui/AccountPageHeader";

export function FavoritesPage() {
  const { ids } = useFavorites();
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({ open: false, message: "", productId: null });

  // useCallback -- misma razón que en CatalogPage: ProductCard usa
  // React.memo, así que `onQuote` necesita mantener referencia estable.
  const handleQuote = useCallback((prod: Product) => {
    setModal({ open: true, message: `Producto: ${prod.name} (SKU ${prod.sku})`, productId: prod.id });
  }, []);

  // Trae los N productos favoritos en paralelo (una query por id, cacheadas
  // individualmente por TanStack Query -- si el usuario ya visitó alguno de
  // esos productos, esa entrada sale del cache sin golpear la red de nuevo).
  // Un producto borrado/inaccesible se filtra en vez de romper la página
  // entera (mismo comportamiento que el `.catch(() => null)` anterior).
  const { products, isLoading } = useProductsByIdsQuery(ids);

  return (
    <div className="flex flex-col gap-5">

      <AccountPageHeader
        icon="star"
        accent="#EC4899"
        title="Favoritos"
        subtitle={
          isLoading
            ? "Cargando…"
            : products.length > 0
              ? `${products.length} producto${products.length !== 1 ? "s" : ""} guardado${products.length !== 1 ? "s" : ""}`
              : "Sin favoritos aún"
        }
        action={
          products.length > 0 ? (
            <Button as={Link} to="/catalogo" variant="ghost" size="sm" style={{ color: "#8AA3BC", borderColor: "rgba(255,255,255,.15)" }}>
              Ver más productos →
            </Button>
          ) : undefined
        }
      />

      {/* ── Grid ── */}
      {isLoading ? (
        <CenteredSpinner label="Cargando favoritos…" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Icon name="star" size={24} />}
          title="No tenés favoritos todavía"
          message="Tocá la estrella en cualquier producto del catálogo para guardarlo acá."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
          {/* Mismo mínimo y mismo gap que el catálogo: es la misma tarjeta, y
              con 220px las píldoras de acción sobre la imagen quedan
              apretadas. */}
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onQuote={handleQuote} />
          ))}
        </div>
      )}

      <QuoteModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        initialMessage={modal.message}
        productId={modal.productId}
      />
    </div>
  );
}
