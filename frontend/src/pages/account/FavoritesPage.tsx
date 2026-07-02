import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CenteredSpinner, EmptyState, Button, Icon } from "@/shared/ui";
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
    if (ids.length === 0) { setProducts([]); return; }
    setProducts(null);
    Promise.all(ids.map((id) => productApi.get(id).catch(() => null)))
      .then((list) => setProducts(list.filter((p): p is Product => p !== null)))
      .catch(() => setProducts([]));
  }, [ids]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: color.ink900, borderRadius: 14,
        padding: "22px 28px",
        boxShadow: "0 4px 24px rgba(7,17,31,.12)",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${color.primary} 0%, #7FB0FF 55%, transparent 100%)`,
        }} />
        <div style={{
          position: "absolute", top: -40, right: -20, width: 140, height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,87,217,.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)",
              color: "#EC4899",
            }}>
              <Icon name="star" size={20} />
            </span>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
                Favoritos
              </div>
              <div style={{ fontFamily: font.body, fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
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
