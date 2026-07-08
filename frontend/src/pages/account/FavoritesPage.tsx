import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button, Icon } from "@/shared/ui";
import { useFavorites } from "@/shared/lib/useFavorites";
import { productApi, type Product } from "@/entities/product";
import { ProductCard } from "@/entities/product/ProductCard";
import { QuoteModal } from "@/features/quote/QuoteModal";

export function FavoritesPage() {
  const { ids } = useFavorites();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({ open: false, message: "", productId: null });

  useEffect(() => {
    if (ids.length === 0) { setProducts([]); return; }
    setProducts(null);
    Promise.all(ids.map((id) => productApi.get(id).catch(() => null)))
      .then((list) => setProducts(list.filter((p): p is Product => p !== null)))
      .catch(() => setProducts([]));
  }, [ids]);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden bg-ink900 rounded-[14px] py-[22px] px-7 shadow-[0_4px_24px_rgba(7,17,31,.12)]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,#0057D9_0%,#7FB0FF_55%,transparent_100%)]" />
        <div className="absolute -top-10 -right-5 w-[140px] h-[140px] rounded-full bg-[radial-gradient(circle,rgba(0,87,217,.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-[rgba(255,255,255,.08)] border border-[rgba(255,255,255,.12)] text-[#EC4899]">
              <Icon name="star" size={20} />
            </span>
            <div>
              <div className="font-display text-xl font-extrabold text-white tracking-[-.02em]">
                Favoritos
              </div>
              <div className="font-body text-[12.5px] text-[#94A3B8] mt-[3px]">
                {products === null
                  ? "Cargando…"
                  : products.length > 0
                    ? `${products.length} producto${products.length !== 1 ? "s" : ""} guardado${products.length !== 1 ? "s" : ""}`
                    : "Sin favoritos aún"}
              </div>
            </div>
          </div>
          {(products?.length ?? 0) > 0 && (
            <Button as={Link} to="/catalogo" variant="ghost" size="sm" style={{ color: "#94A3B8", borderColor: "rgba(255,255,255,.15)" }}>
              Ver más productos →
            </Button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {products === null ? (
        <CenteredSpinner label="Cargando favoritos…" />
      ) : products.length === 0 ? (
        <EmptyState
          title="No tenés favoritos todavía"
          message="Tocá la estrella en cualquier producto del catálogo para guardarlo acá."
          action={<Button as={Link} to="/catalogo">Ir al catálogo</Button>}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onQuote={(prod) => setModal({ open: true, message: `Producto: ${prod.name} (SKU ${prod.sku})`, productId: prod.id })}
            />
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
