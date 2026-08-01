import type * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link, useSearchParams } from "react-router-dom";
import { Container, Select, EmptyState, Button, Icon, Pagination } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { ProductCard } from "@/entities/product/ProductCard";
import { type Product } from "@/entities/product";
import { useProductsQuery } from "@/entities/product/queries";
import { type Category } from "@/entities/category";
import { useCategoriesQuery } from "@/entities/category/queries";
import { type Brand } from "@/entities/brand";
import { useBrandsQuery } from "@/entities/brand/queries";
import { VEHICLE_TYPES } from "@/shared/config";
import { useBreakpoint } from "@/shared/lib/useBreakpoint";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";

// ── Skeleton card ─────────────────────────────────────────────────────────────
// El esqueleto espeja la tarjeta real: mismo radio, mismo borde, misma
// proporción de imagen (1.42) y las mismas cuatro filas de texto. Si no
// coincide, la grilla salta cuando llegan los datos -- y ese salto se nota más
// que la espera que el esqueleto venía a disimular.
function SkeletonCard() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E7EDF4]">
      <div className="bg-[#F4F7FB] relative overflow-hidden" style={{ aspectRatio: "0.95" }}>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,.6)_50%,transparent_100%)] animate-[shimmer_1.4s_infinite]" />
      </div>
      {/* Espeja el panel real: mismo margen, mismo radio y las tres filas de
          texto. Si el esqueleto no coincide con la tarjeta, la grilla salta
          cuando llegan los datos -- y ese salto se nota más que la espera que
          el esqueleto venía a disimular. */}
      <div className="absolute left-2.5 right-2.5 bottom-2.5 rounded-[10px] bg-white border border-white py-3 px-3.5 flex flex-col gap-2">
        <div className="h-2.5 w-[55%] bg-[#F1F5FA] rounded-sm" />
        <div className="h-3.5 w-[90%] bg-[#F1F5FA] rounded-sm" />
        <div className="h-5 w-[42%] bg-[#F1F5FA] rounded-sm mt-1" />
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
        aria-label={`Quitar filtro ${label}`}
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
  // Las etiquetas de sección eran Fira Mono 10.5px en mayúscula con .1em de
  // tracking. Es el mismo gesto que ya se corrigió en `shared/ui/Field.tsx`:
  // funciona en una palabra suelta y cansa cuando hay cuatro apiladas, porque
  // la mayúscula borra la silueta que el ojo usa para reconocer una palabra.
  // Y era mono sobre palabras, que es justo lo que se sacó de la ficha técnica.
  const etiqueta = "font-body text-[12.5px] font-semibold text-ink800 mb-2.5";

  return (
    // Secciones separadas por líneas, no por huecos: cuatro bloques flotando
    // en una caja se leen como una lista de cosas sueltas. Con hairlines y
    // padding parejo se lee como un panel.
    <div className="divide-y divide-border">
      <div className="flex items-center justify-between py-3.5 px-[18px]">
        <span className="font-body text-[14px] font-semibold text-ink900">Filtros</span>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="font-body text-[12.5px] font-semibold text-textMuted hover:text-primary bg-transparent border-none cursor-pointer py-1 px-2 rounded-md hover:bg-surface transition-colors duration-150"
            >
              Limpiar
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar filtros"
              className="bg-transparent hover:bg-surface border-none rounded-md w-7 h-7 flex items-center justify-center cursor-pointer text-textMuted transition-colors duration-150"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="py-4 px-[18px]">
        <div className={etiqueta}>Categoría</div>
        <Select value={categoryId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div className="py-4 px-[18px]">
        <div className={etiqueta}>Vehículo</div>
        <div className="flex flex-wrap gap-1.5">
          {VEHICLE_TYPES.map((t) => {
            const active = vehicleType === t;
            return (
              <button
                key={t}
                onClick={() => setVehicleType(t)}
                // Activo en tinta llena y no en azul suave: el azul de marca ya
                // es el color del botón principal del sitio, y un filtro
                // seleccionado no es una acción a punto de ejecutarse.
                // Borde de 1px -- 1.5px es el grosor que hace ver "formulario
                // viejo" cuando hay seis controles juntos.
                className={clsx(
                  "font-body text-[12.5px] font-medium py-[6px] px-3 rounded-pill cursor-pointer border transition-[background-color,border-color,color] duration-150",
                  active
                    ? "border-ink900 bg-ink900 text-white"
                    : "border-border bg-white text-ink700 hover:border-borderStrong hover:bg-surface",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="py-4 px-[18px]">
        <div className={etiqueta}>Marca</div>
        <Select value={brandId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBrandId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      {/* Interruptor y no un checkbox metido en una caja con borde. La caja lo
          hacía parecer un campo de formulario más -- algo que se completa --
          cuando en realidad es una preferencia que se enciende. */}
      <label className="flex items-center justify-between gap-3 py-4 px-[18px] cursor-pointer group/sw">
        <span className="font-body text-[13px] font-medium text-ink800">Solo en stock</span>
        <span className="relative shrink-0">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="peer sr-only"
          />
          <span
            className={clsx(
              "block w-[38px] h-[22px] rounded-pill transition-colors duration-150",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2",
              inStock ? "bg-primary" : "bg-[#DCE3EC] group-hover/sw:bg-borderStrong",
            )}
          />
          <span
            className={clsx(
              "absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(7,17,31,.25)] transition-transform duration-150",
              inStock && "translate-x-4",
            )}
          />
        </span>
      </label>
    </div>
  );
}

// Tamaño de página del catálogo público. Coordinado con `skip`/`limit` en
// cada request y reseteado a 0 en cada cambio de filtro (ver `setQPage0` y
// hermanos) para que nunca se pida una página fuera de rango tras filtrar.
// 48 venía de cuando las tarjetas medían 210px con una imagen de 110: entraban
// 5 por fila y la página eran ~10 filas. Con la tarjeta nueva (258px, imagen a
// sangre) son 4 por fila y 12 filas -- más de 3.000px de scroll, y 48 fotos
// cargando en vez de 48 miniaturas.
//
// 24 no es un número arbitrario: da 6 filas en escritorio, es divisible por 2,
// 3 y 4 -- así la última fila nunca queda coja en ningún ancho -- y coincide
// con el default del endpoint de productos.
//
// Para referencia: Tiendanube muestra 12 por defecto (hasta 20), Frávega ~40 y
// Mercado Libre 50. Los dos últimos son catálogos de navegación con decenas de
// miles de ítems; acá la gente busca una pieza concreta para su auto, filtra, y
// no scrollea doscientos productos.
const PAGE_SIZE = 24;

// ── Main ──────────────────────────────────────────────────────────────────────
export function CatalogPage() {
  usePageMeta("Catálogo de repuestos", "Repuestos, lubricantes y baterías para autos, motos y camiones. Filtrá por categoría, marca y tipo de vehículo.");
  const [params] = useSearchParams();

  // TanStack Query -- categorías y marcas cambian poco (staleTime largo, ver
  // entities/*/queries.ts) así que en la práctica se piden una sola vez por
  // sesión de navegación, no en cada visita a esta página.
  const { data: categories = [] } = useCategoriesQuery();
  const { data: brands = [] } = useBrandsQuery();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [vehicleType, setVehicleType] = useState<string>("Todos");
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(0);
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
    const catName = params.get("cat");
    if (catName && categories.length) {
      const match = categories.find((c) => c.name === catName);
      if (match) setCategoryId(match.id);
    }
  }, [params, categories]);

  // Debounce de 220ms sobre el objeto de filtros completo (mismo criterio
  // que la versión anterior con setTimeout manual) -- evita un fetch por
  // cada tecla en el buscador. `useProductsQuery` corre con `placeholderData`
  // (ver entities/product/queries.ts), así que el grid de resultados no
  // parpadea a skeleton en cada cambio de filtro/página: se ve la página
  // anterior atenuada (`isFetching`) hasta que llega la nueva.
  const debouncedParams = useDebouncedValue(
    {
      q: q || undefined,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
      vehicle_type: vehicleType !== "Todos" ? vehicleType : undefined,
      in_stock: inStock || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
    220,
  );
  const { data, isPending, isFetching } = useProductsQuery(debouncedParams);
  const products = data?.items;
  const total = data?.total ?? 0;

  // useCallback -- ProductCard está envuelto en React.memo (ver
  // entities/product/ProductCard.tsx); si `onQuote` fuera un closure inline
  // nuevo en cada render de esta página, React.memo lo vería como un prop
  // "cambiado" y re-renderizaría las 48 cards igual, anulando el memo.
  const handleQuote = useCallback((prod: Product) => {
    setModal({
      open: true,
      message: `Hola Crow! Me interesa este producto: ${prod.name} (SKU: ${prod.sku}). ¿Tienen disponibilidad?`,
      productId: prod.id,
    });
  }, []);

  // Cambiar cualquier filtro vuelve a la página 0 en el mismo batch de
  // estado que el cambio del filtro (React los agrupa en un solo render),
  // así el efecto de arriba dispara un único fetch, no dos.
  // Cambiar de página tenía que subir el scroll y no lo hacía: si estabas
  // mirando la última fila y tocabas "siguiente", aparecías en la mitad de la
  // página nueva sin nada que indicara que había cambiado.
  //
  // `auto` y no `smooth`: la lista se reemplaza en cuanto llega la respuesta, y
  // un scroll animado de 3.000px termina después, así que la persona ve pasar
  // volando productos que ya no son los que estaba mirando.
  const irAPagina = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const setQPage0 = (v: string) => { setQ(v); setPage(0); };
  const setCategoryIdPage0 = (v: number | "") => { setCategoryId(v); setPage(0); };
  const setBrandIdPage0 = (v: number | "") => { setBrandId(v); setPage(0); };
  const setVehicleTypePage0 = (v: string) => { setVehicleType(v); setPage(0); };
  const setInStockPage0 = (v: boolean) => { setInStock(v); setPage(0); };

  const clearFilters = () => {
    setQ(""); setCategoryId(""); setBrandId(""); setVehicleType("Todos"); setInStock(false);
    setPage(0);
  };

  const hasFilters = q || categoryId !== "" || brandId !== "" || vehicleType !== "Todos" || inStock;

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) chips.push({ label: cat.name, clear: () => setCategoryIdPage0("") });
    if (vehicleType !== "Todos") chips.push({ label: vehicleType, clear: () => setVehicleTypePage0("Todos") });
    const brand = brands.find((b) => b.id === brandId);
    if (brand) chips.push({ label: brand.name, clear: () => setBrandIdPage0("") });
    if (inStock) chips.push({ label: "En stock", clear: () => setInStockPage0(false) });
    if (q) chips.push({ label: `"${q}"`, clear: () => setQPage0("") });
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
          {/* Breadcrumb. Sale de la mono en mayúscula: son dos palabras
              corrientes y la versión anterior las volvía un código. El
              separador queda más tenue que el texto para que no compita. */}
          <div className="font-body text-[13px] text-[#7C97B3] mb-5">
            <Link to="/" className="text-inherit no-underline hover:text-white transition-colors duration-150">
              Inicio
            </Link>
            <span className="mx-2 text-[#2A3F55]">/</span>
            <span className="text-white font-medium">Catálogo</span>
          </div>

          <div className="flex items-end justify-between gap-10 pb-8">
            <div>
              <h1 className="font-display text-4xl font-black tracking-[-.025em] text-white mb-2">
                Catálogo de repuestos
              </h1>
              <p className="font-body text-[15px] text-[#5E819D] m-0">
                Stock actualizado · Cotización directa por WhatsApp
              </p>
            </div>

            {/* Search bar in header */}
            <div className="relative w-80 shrink-0">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64809E] pointer-events-none">
                <Icon name="search" size={16} />
              </div>
              <input
                value={q}
                onChange={(e) => setQPage0(e.target.value)}
                placeholder="Buscar por nombre, SKU o marca…"
                className="w-full box-border h-11 pr-3.5 pl-[42px] font-body text-sm text-white bg-[rgba(255,255,255,.07)] border-[1.5px] border-[rgba(255,255,255,.1)] rounded-md outline-none transition-[border-color,background] duration-150 focus:border-[rgba(0,87,217,.6)] focus:bg-[rgba(255,255,255,.1)]"
              />
              {q && (
                <button
                  onClick={() => setQPage0("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer text-[#5E819D] p-1 leading-[0]"
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
              categoryId={categoryId} setCategoryId={setCategoryIdPage0}
              brandId={brandId} setBrandId={setBrandIdPage0}
              vehicleType={vehicleType} setVehicleType={setVehicleTypePage0}
              inStock={inStock} setInStock={setInStockPage0}
              hasFilters={!!hasFilters} clearFilters={clearFilters}
              onClose={() => setDrawerOpen(false)}
            />
            <div className="px-[18px] pb-6">
              <Button fullWidth onClick={() => setDrawerOpen(false)}>Ver resultados</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ──
          Lienzo casi blanco y no `surface` (#F8FAFC). El gris de antes estaba
          tan cerca del blanco de las tarjetas que lo único que separaba una de
          otra era el borde, y una grilla definida por bordes se lee como una
          planilla. Acá la separación la hace el aire: 20px de gap. */}
      <section className="bg-[#FCFDFE] min-h-[60vh]">
        <Container
          className={clsx(
            "pt-5 pb-[60px] md:pt-7 md:pb-20 items-start gap-7",
            isMobile ? "block" : "grid grid-cols-[252px_1fr]",
          )}
        >

          {/* ── Sidebar (desktop only) ── */}
          {!isMobile && (
            <aside className="sticky top-[90px] bg-white border border-[#E7EDF4] rounded-xl shadow-[0_1px_2px_rgba(13,23,40,.04)] overflow-hidden">
              <FilterPanel
                categories={categories} brands={brands}
                categoryId={categoryId} setCategoryId={setCategoryIdPage0}
                brandId={brandId} setBrandId={setBrandIdPage0}
                vehicleType={vehicleType} setVehicleType={setVehicleTypePage0}
                inStock={inStock} setInStock={setInStockPage0}
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
                  {isPending ? (
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
            {isPending ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
                {/* 8 y no 24: el esqueleto solo tiene que ocupar lo que se ve
                    sin scrollear. Pintar una página entera de placeholders
                    alarga el documento y hace saltar la barra de scroll. */}
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : !products || products.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                message="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
                action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
              />
            ) : (
              <>
                <div
                  className={clsx(
                    "grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5 transition-opacity duration-150",
                    isFetching && "opacity-60",
                  )}
                >
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} onQuote={handleQuote} />
                  ))}
                </div>
                {total > PAGE_SIZE && (
                  <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={irAPagina} />
                )}
              </>
            )}
          </div>
        </Container>
      </section>

      <QuoteModal open={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} initialMessage={modal.message} productId={modal.productId} />
    </>
  );
}
