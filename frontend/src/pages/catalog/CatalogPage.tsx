import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useSearchParams } from "react-router-dom";
import { Container, Select, EmptyState, Button, Icon } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { ProductCard } from "@/entities/product/ProductCard";
import { productApi, type Product } from "@/entities/product";
import { categoryApi, type Category } from "@/entities/category";
import { brandApi, type Brand } from "@/entities/brand";
import { VEHICLE_TYPES } from "@/shared/config/categories";
import { color, font, radius, shadow } from "@/shared/config/theme";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${color.border}`,
      borderRadius: radius.lg, overflow: "hidden",
    }}>
      <div style={{ height: 180, background: color.surface, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,.6) 50%, transparent 100%)",
          animation: "shimmer 1.4s infinite",
        }} />
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: 10, width: "40%", background: color.surface, borderRadius: 4 }} />
        <div style={{ height: 14, width: "85%", background: color.surface, borderRadius: 4 }} />
        <div style={{ height: 14, width: "60%", background: color.surface, borderRadius: 4 }} />
        <div style={{ height: 20, width: "35%", background: color.surface, borderRadius: 4, marginTop: 4 }} />
        <div style={{ height: 36, background: color.surface, borderRadius: radius.md, marginTop: 4 }} />
      </div>
    </div>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px 4px 12px",
        background: color.primarySoft,
        border: `1px solid rgba(0,87,217,.2)`,
        borderRadius: radius.pill,
        fontFamily: font.body, fontSize: 12.5, fontWeight: 600,
        color: color.primary,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? color.primary : "rgba(0,87,217,.15)",
          border: "none", borderRadius: "50%",
          width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0, transition: "background .15s", flexShrink: 0,
          color: hov ? "#fff" : color.primary,
        }}
      >
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Filter panel (shared between sidebar and drawer) ─────────────────────────
function FilterPanel({
  categories, brands, categoryId, setCategoryId,
  brandId, setBrandId, vehicleType, setVehicleType,
  inStock, setInStock, hasFilters, clearFilters, onClose,
}: {
  categories: Category[]; brands: Brand[];
  categoryId: number | ""; setCategoryId: (v: number | "") => void;
  brandId: number | ""; setBrandId: (v: number | "") => void;
  vehicleType: string; setVehicleType: (v: string) => void;
  inStock: boolean; setInStock: (v: boolean) => void;
  hasFilters: boolean; clearFilters: () => void;
  onClose?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 700, color: color.ink900 }}>Filtros</span>
        <div style={{ display: "flex", gap: 8 }}>
          {hasFilters && (
            <button onClick={clearFilters} style={{ fontFamily: font.body, fontSize: 12, color: color.primary, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
              Limpiar
            </button>
          )}
          {onClose && (
            <button onClick={onClose} style={{ background: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.md, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: color.textMuted }}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 10 }}>Categoría</div>
        <Select value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div>
        <div style={{ fontFamily: font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 10 }}>Vehículo</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {VEHICLE_TYPES.map((t) => {
            const active = vehicleType === t;
            return (
              <button key={t} onClick={() => setVehicleType(t)} style={{ fontFamily: font.body, fontSize: 12.5, fontWeight: 600, padding: "5px 12px", borderRadius: radius.pill, cursor: "pointer", border: `1.5px solid ${active ? color.primary : color.border}`, background: active ? color.primarySoft : "#fff", color: active ? color.primary : color.textMuted, transition: "all .15s" }}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: font.mono, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: color.textFaint, textTransform: "uppercase", marginBottom: 10 }}>Marca</div>
        <Select value={brandId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBrandId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", border: `1.5px solid ${inStock ? color.primary : color.border}`, borderRadius: radius.md, background: inStock ? color.primarySoft : "#fff", transition: "all .15s" }}>
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} style={{ width: 15, height: 15, accentColor: color.primary, flexShrink: 0 }} />
        <span style={{ fontFamily: font.body, fontSize: 13, fontWeight: 600, color: inStock ? color.primary : color.ink800 }}>Solo en stock</span>
      </label>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function CatalogPage() {
  usePageMeta("Catálogo de repuestos", "Repuestos, lubricantes y baterías para autos, motos y camiones. Filtrá por categoría, marca y tipo de vehículo.");
  const [params] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [vehicleType, setVehicleType] = useState<string>("Todos");
  const [inStock, setInStock] = useState(false);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({ open: false, message: "", productId: null });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
    brandApi.list().then(setBrands).catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    const catName = params.get("cat");
    if (catName && categories.length) {
      const match = categories.find((c) => c.name === catName);
      if (match) setCategoryId(match.id);
    }
  }, [params, categories]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setProducts(null);
      productApi
        .list({
          q: q || undefined,
          category_id: categoryId || undefined,
          brand_id: brandId || undefined,
          vehicle_type: vehicleType !== "Todos" ? vehicleType : undefined,
          in_stock: inStock || undefined,
          limit: 48,
        })
        .then((r) => { setProducts(r.items); setTotal(r.total); })
        .catch(() => { setProducts([]); setTotal(0); });
    }, 220);
    return () => clearTimeout(handle);
  }, [q, categoryId, brandId, vehicleType, inStock]);

  const clearFilters = () => {
    setQ(""); setCategoryId(""); setBrandId(""); setVehicleType("Todos"); setInStock(false);
  };

  const hasFilters = q || categoryId !== "" || brandId !== "" || vehicleType !== "Todos" || inStock;

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) chips.push({ label: cat.name, clear: () => setCategoryId("") });
    if (vehicleType !== "Todos") chips.push({ label: vehicleType, clear: () => setVehicleType("Todos") });
    const brand = brands.find((b) => b.id === brandId);
    if (brand) chips.push({ label: brand.name, clear: () => setBrandId("") });
    if (inStock) chips.push({ label: "En stock", clear: () => setInStock(false) });
    if (q) chips.push({ label: `"${q}"`, clear: () => setQ("") });
    return chips;
  }, [categories, brands, categoryId, brandId, vehicleType, inStock, q]);

  return (
    <>
      {/* ── Header ── */}
      <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(700px 300px at 80% 0%, rgba(0,87,217,.22), transparent 60%)",
        }} />
        <Container style={{ position: "relative", padding: "40px 40px 0" }}>
          {/* Breadcrumb */}
          <div style={{ fontFamily: font.mono, fontSize: 11, color: "#3F5165", letterSpacing: ".08em", marginBottom: 20 }}>
            INICIO <span style={{ margin: "0 6px", color: "#1E2D3D" }}>/</span>
            <span style={{ color: color.primary }}>CATÁLOGO</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, paddingBottom: 32 }}>
            <div>
              <h1 style={{
                fontFamily: font.display, fontSize: 36, fontWeight: 900,
                letterSpacing: "-.025em", color: "#fff", marginBottom: 8,
              }}>
                Catálogo de repuestos
              </h1>
              <p style={{ fontFamily: font.body, fontSize: 15, color: "#4E6B82", margin: 0 }}>
                Stock actualizado · Cotización directa por WhatsApp
              </p>
            </div>

            {/* Search bar in header */}
            <div style={{ position: "relative", width: 320, flexShrink: 0 }}>
              <div style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#3F5165", pointerEvents: "none",
              }}>
                <Icon name="search" size={16} />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, SKU o marca…"
                style={{
                  width: "100%", boxSizing: "border-box",
                  height: 44, padding: "0 14px 0 42px",
                  fontFamily: font.body, fontSize: 14, color: "#fff",
                  background: "rgba(255,255,255,.07)",
                  border: "1.5px solid rgba(255,255,255,.1)",
                  borderRadius: radius.md, outline: "none",
                  transition: "border-color .15s, background .15s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(0,87,217,.6)";
                  e.target.style.background = "rgba(255,255,255,.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,.1)";
                  e.target.style.background = "rgba(255,255,255,.07)";
                }}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#4E6B82",
                    padding: 4, lineHeight: 0,
                  }}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* ── Mobile filter drawer ── */}
      {isMobile && drawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(7,17,31,.5)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative", background: "#fff",
            borderRadius: "16px 16px 0 0", boxShadow: shadow.lg,
            maxHeight: "80vh", overflowY: "auto",
            animation: "slideUp .25s ease both",
          }}>
            <div style={{ width: 36, height: 4, background: color.border, borderRadius: 2, margin: "12px auto 4px" }} />
            <FilterPanel
              categories={categories} brands={brands}
              categoryId={categoryId} setCategoryId={setCategoryId}
              brandId={brandId} setBrandId={setBrandId}
              vehicleType={vehicleType} setVehicleType={setVehicleType}
              inStock={inStock} setInStock={setInStock}
              hasFilters={!!hasFilters} clearFilters={clearFilters}
              onClose={() => setDrawerOpen(false)}
            />
            <div style={{ padding: "0 18px 24px" }}>
              <Button fullWidth onClick={() => setDrawerOpen(false)}>Ver resultados</Button>
            </div>
          </div>
          <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
        </div>
      )}

      {/* ── Body ── */}
      <section style={{ background: color.surface, minHeight: "60vh" }}>
        <Container style={{
          padding: isMobile ? "20px 16px 60px" : "28px 40px 80px",
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: "252px 1fr",
          gap: 28, alignItems: "start",
        }}>

          {/* ── Sidebar (desktop only) ── */}
          {!isMobile && (
            <aside style={{
              position: "sticky", top: 90,
              background: "#fff", border: `1px solid ${color.border}`,
              borderRadius: radius.lg, boxShadow: shadow.sm, overflow: "hidden",
            }}>
              <FilterPanel
                categories={categories} brands={brands}
                categoryId={categoryId} setCategoryId={setCategoryId}
                brandId={brandId} setBrandId={setBrandId}
                vehicleType={vehicleType} setVehicleType={setVehicleType}
                inStock={inStock} setInStock={setInStock}
                hasFilters={!!hasFilters} clearFilters={clearFilters}
              />
            </aside>
          )}

          {/* ── Results ── */}
          <div>
            {/* Results bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: activeChips.length ? 12 : 0 }}>
                <div style={{ fontFamily: font.body, fontSize: 14, color: color.textMuted }}>
                  {products === null ? (
                    <span style={{ color: color.textFaint }}>Cargando…</span>
                  ) : (
                    <>
                      <strong style={{ fontFamily: font.display, fontSize: 16, color: color.ink900 }}>{total}</strong>
                      <span style={{ marginLeft: 4 }}>producto{total !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
                {isMobile && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontFamily: font.body, fontSize: 13, fontWeight: 600,
                      color: hasFilters ? color.primary : color.ink700,
                      background: hasFilters ? color.primarySoft : "#fff",
                      border: `1.5px solid ${hasFilters ? color.primary : color.border}`,
                      borderRadius: radius.pill, padding: "7px 14px",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="settings" size={14} />
                    Filtros{hasFilters ? ` (${activeChips.length})` : ""}
                  </button>
                )}
              </div>

              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeChips.map((chip) => (
                    <FilterChip key={chip.label} label={chip.label} onRemove={chip.clear} />
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            {products === null ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                message="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
                action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuote={(prod) => setModal({ open: true, message: `Hola Crow! Me interesa este producto: ${prod.name} (SKU: ${prod.sku}). ¿Tienen disponibilidad?`, productId: prod.id })}
                  />
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      <QuoteModal open={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} initialMessage={modal.message} productId={modal.productId} />
    </>
  );
}
