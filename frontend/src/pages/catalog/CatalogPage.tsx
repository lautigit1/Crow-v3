import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { useSearchParams } from "react-router-dom";
import { Container, Select, EmptyState, Button, Icon } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { ProductCard } from "@/entities/product/ProductCard";
import { productApi, type Product } from "@/entities/product";
import { categoryApi, type Category } from "@/entities/category";
import { brandApi, type Brand } from "@/entities/brand";
import { VEHICLE_TYPES } from "@/shared/config/categories";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="h-[180px] bg-surface relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,.6)_50%,transparent_100%)] animate-[shimmer_1.4s_infinite]" />
      </div>
      <div className="p-4 flex flex-col gap-2.5">
        <div className="h-2.5 w-[40%] bg-surface rounded-sm" />
        <div className="h-3.5 w-[85%] bg-surface rounded-sm" />
        <div className="h-3.5 w-[60%] bg-surface rounded-sm" />
        <div className="h-5 w-[35%] bg-surface rounded-sm mt-1" />
        <div className="h-9 bg-surface rounded-md mt-1" />
      </div>
    </div>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1.5 py-1 pr-2.5 pl-3 bg-primarySoft border border-[rgba(0,87,217,.2)] rounded-pill font-body text-[12.5px] font-semibold text-primary">
      {label}
      <button
        onClick={onRemove}
        className="bg-[rgba(0,87,217,.15)] hover:bg-primary border-none rounded-full w-4 h-4 flex items-center justify-center cursor-pointer p-0 transition-[background] duration-150 shrink-0 text-primary hover:text-white"
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
    <div className="flex flex-col gap-5 py-4 px-[18px]">
      <div className="flex items-center justify-between">
        <span className="font-body text-[13px] font-bold text-ink900">Filtros</span>
        <div className="flex gap-2">
          {hasFilters && (
            <button onClick={clearFilters} className="font-body text-xs text-primary bg-none border-none cursor-pointer p-0 font-semibold">
              Limpiar
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="bg-surface border border-border rounded-md w-7 h-7 flex items-center justify-center cursor-pointer text-textMuted">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10.5px] font-bold tracking-[.1em] text-textFaint uppercase mb-2.5">Categoría</div>
        <Select value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div>
        <div className="font-mono text-[10.5px] font-bold tracking-[.1em] text-textFaint uppercase mb-2.5">Vehículo</div>
        <div className="flex flex-wrap gap-1.5">
          {VEHICLE_TYPES.map((t) => {
            const active = vehicleType === t;
            return (
              <button
                key={t}
                onClick={() => setVehicleType(t)}
                className={clsx(
                  "font-body text-[12.5px] font-semibold py-[5px] px-3 rounded-pill cursor-pointer border-[1.5px] transition-all duration-150",
                  active ? "border-primary bg-primarySoft text-primary" : "border-border bg-white text-textMuted",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10.5px] font-bold tracking-[.1em] text-textFaint uppercase mb-2.5">Marca</div>
        <Select value={brandId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBrandId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      <label
        className={clsx(
          "flex items-center gap-2.5 cursor-pointer py-2.5 px-3 rounded-md border-[1.5px] transition-all duration-150",
          inStock ? "border-primary bg-primarySoft" : "border-border bg-white",
        )}
      >
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="w-[15px] h-[15px] accent-primary shrink-0" />
        <span className={clsx("font-body text-[13px] font-semibold", inStock ? "text-primary" : "text-ink800")}>Solo en stock</span>
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
  // `isMobile` drives which markup gets *mounted*, not just how it looks: the
  // sidebar (desktop) and the drawer (mobile) each render their own full
  // `FilterPanel` copy (selects, checkbox, buttons). Rendering both at once
  // and hiding one with CSS would duplicate those interactive/labelled
  // elements in the DOM -- same reasoning as `widgets/navbar/Navbar.tsx`'s
  // kept `useBreakpoint()`. Purely cosmetic sizing below still uses `md:`.
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
      <section className="bg-ink900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(700px_300px_at_80%_0%,rgba(0,87,217,.22),transparent_60%)]" />
        {/* This header uses a fixed 40px side padding at every breakpoint
            (unlike Container's own responsive 16/40 default), so the
            horizontal padding is passed as `style` -- inline style always
            wins over Container's own utility classes regardless of Tailwind's
            generated CSS order, which a conflicting className couldn't
            guarantee (see shared/ui/Field.tsx's comment on the same trap). */}
        <Container className="relative pt-10 pb-0" style={{ paddingLeft: 40, paddingRight: 40 }}>
          {/* Breadcrumb */}
          <div className="font-mono text-[11px] text-[#3F5165] tracking-[.08em] mb-5">
            INICIO <span className="mx-1.5 text-[#1E2D3D]">/</span>
            <span className="text-primary">CATÁLOGO</span>
          </div>

          <div className="flex items-end justify-between gap-10 pb-8">
            <div>
              <h1 className="font-display text-4xl font-black tracking-[-.025em] text-white mb-2">
                Catálogo de repuestos
              </h1>
              <p className="font-body text-[15px] text-[#4E6B82] m-0">
                Stock actualizado · Cotización directa por WhatsApp
              </p>
            </div>

            {/* Search bar in header */}
            <div className="relative w-80 shrink-0">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3F5165] pointer-events-none">
                <Icon name="search" size={16} />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, SKU o marca…"
                className="w-full box-border h-11 pr-3.5 pl-[42px] font-body text-sm text-white bg-[rgba(255,255,255,.07)] border-[1.5px] border-[rgba(255,255,255,.1)] rounded-md outline-none transition-[border-color,background] duration-150 focus:border-[rgba(0,87,217,.6)] focus:bg-[rgba(255,255,255,.1)]"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-[#4E6B82] p-1 leading-[0]"
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
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <div onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-[rgba(7,17,31,.5)] backdrop-blur-[4px]" />
          <div className="relative bg-white rounded-t-2xl shadow-lg max-h-[80vh] overflow-y-auto animate-[slideUp_.25s_ease_both]">
            <div className="w-9 h-1 bg-border rounded-[2px] mx-auto mt-3 mb-1" />
            <FilterPanel
              categories={categories} brands={brands}
              categoryId={categoryId} setCategoryId={setCategoryId}
              brandId={brandId} setBrandId={setBrandId}
              vehicleType={vehicleType} setVehicleType={setVehicleType}
              inStock={inStock} setInStock={setInStock}
              hasFilters={!!hasFilters} clearFilters={clearFilters}
              onClose={() => setDrawerOpen(false)}
            />
            <div className="px-[18px] pb-6">
              <Button fullWidth onClick={() => setDrawerOpen(false)}>Ver resultados</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <section className="bg-surface min-h-[60vh]">
        <Container
          className={clsx(
            "pt-5 pb-[60px] md:pt-7 md:pb-20 items-start gap-7",
            isMobile ? "block" : "grid grid-cols-[252px_1fr]",
          )}
        >

          {/* ── Sidebar (desktop only) ── */}
          {!isMobile && (
            <aside className="sticky top-[90px] bg-white border border-border rounded-lg shadow-sm overflow-hidden">
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
            <div className="mb-4">
              <div className={clsx("flex items-center justify-between", activeChips.length ? "mb-3" : "mb-0")}>
                <div className="font-body text-sm text-textMuted">
                  {products === null ? (
                    <span className="text-textFaint">Cargando…</span>
                  ) : (
                    <>
                      <strong className="font-display text-base text-ink900">{total}</strong>
                      <span className="ml-1">producto{total !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
                {isMobile && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className={clsx(
                      "flex items-center gap-1.5 font-body text-[13px] font-semibold rounded-pill py-[7px] px-3.5 cursor-pointer border-[1.5px]",
                      hasFilters ? "text-primary bg-primarySoft border-primary" : "text-ink700 bg-white border-border",
                    )}
                  >
                    <Icon name="settings" size={14} />
                    Filtros{hasFilters ? ` (${activeChips.length})` : ""}
                  </button>
                )}
              </div>

              {/* Active filter chips */}
              {activeChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeChips.map((chip) => (
                    <FilterChip key={chip.label} label={chip.label} onRemove={chip.clear} />
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            {products === null ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                message="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
                action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
              />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5">
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
