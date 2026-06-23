import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import UtilityBar from "../components/UtilityBar";
import SiteHeader, { type NavLink } from "../components/SiteHeader";
import QuoteModal from "../components/QuoteModal";
import Hoverable from "../lib/Hoverable";
import Logo from "../components/Logo";
import { CATALOG } from "../data/catalog";
import { EMAIL, PHONE_DISPLAY, waLink } from "../lib/whatsapp";
import type { CatalogItem } from "../types";
import {
  activeLabel,
  CATEGORY_TABS,
  INITIAL_FILTERS,
  matchFilters,
  partBrandsOf,
  vehicleBrandsOf,
  VEHICLE_TYPES,
  yearOptions,
  type CatalogFilters,
} from "./catalog/filtering";

const MAX = 1320;

const NAV: NavLink[] = [
  { label: "Inicio", href: "/#inicio" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Catálogo", href: "/catalogo", route: true, active: true },
  { label: "Detailing", href: "/#detailing" },
  { label: "Contacto", href: "/#contacto" },
];

const selectStyle: CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 34px 0 13px",
  background: "#F4F6F8",
  border: "1px solid #DDE3E9",
  borderRadius: 2,
  font: "500 14px/1 'IBM Plex Sans',sans-serif",
  color: "#16202B",
  cursor: "pointer",
};
const fieldLabel: CSSProperties = { font: "600 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#8A97A6" };
const cardLabel: CSSProperties = { font: "600 10.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".08em", color: "#8A97A6", marginBottom: 13 };

function Chevron() {
  return <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#8A97A6", fontSize: 11 }}>▾</span>;
}

const availStyle = (avail: CatalogItem["avail"]): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 9px",
  background: "#fff",
  border: avail === "En stock" ? "1px solid #D8EFE0" : "1px solid #F0E2C7",
  font: "600 10px/1 'IBM Plex Mono',monospace",
  color: avail === "En stock" ? "#117a3a" : "#9A6B12",
  letterSpacing: ".04em",
});

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters>(INITIAL_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState("");

  // Seed the category from a ?cat= query param (e.g. coming from the landing page).
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat && (CATEGORY_TABS as readonly string[]).includes(cat)) {
      setFilters((f) => ({ ...f, category: cat }));
    }
  }, [searchParams]);

  const set = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const vehicleBrands = useMemo(() => vehicleBrandsOf(CATALOG), []);
  const partBrands = useMemo(() => partBrandsOf(CATALOG), []);
  const years = useMemo(() => yearOptions(), []);

  const filtered = useMemo(() => CATALOG.filter((p) => matchFilters(p, filters)), [filters]);
  const isEmpty = filtered.length === 0;

  const categoryCounts = useMemo(
    () =>
      CATEGORY_TABS.map((label) => ({
        label,
        count:
          label === "Todas"
            ? CATALOG.filter((p) => matchFilters(p, filters, "category")).length
            : CATALOG.filter((p) => p.cat === label && matchFilters(p, filters, "category")).length,
      })),
    [filters]
  );

  const openQuote = (p: CatalogItem) => {
    setDetalle(`Producto: ${p.name} (SKU ${p.sku}, ${p.brand})`);
    setModalOpen(true);
  };
  const openBlank = () => {
    setDetalle("");
    setModalOpen(true);
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  return (
    <div style={{ background: "#F4F6F8", color: "#16202B", minHeight: "100vh" }}>
      <UtilityBar maxWidth={MAX} />
      <SiteHeader links={NAV} onQuote={openBlank} maxWidth={MAX} />

      {/* Catalog header */}
      <section style={{ background: "#0A1622", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(900px 360px at 85% -20%,rgba(0,102,255,.16),transparent 60%)" }} />
        <div style={{ position: "relative", maxWidth: MAX, margin: "0 auto", padding: "40px 40px 36px" }}>
          <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#7E90A2", letterSpacing: ".06em", marginBottom: 18 }}>
            <a href="/#inicio" style={{ color: "#7E90A2" }}>INICIO</a> <span style={{ color: "#3F5165" }}>/</span> <span style={{ color: "#0066FF" }}>CATÁLOGO</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ font: "800 44px/1.04 'Archivo',sans-serif", letterSpacing: "-.015em", color: "#fff", marginBottom: 14 }}>
                Catálogo de repuestos
              </h1>
              <p style={{ font: "400 16px/1.6 'IBM Plex Sans',sans-serif", color: "#A9B8C7", maxWidth: 560 }}>
                Busca por vehículo, categoría o marca. Disponibilidad actualizada y cotización directa por WhatsApp.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 540 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#8A97A6", fontSize: 16 }}>⌕</span>
                <Hoverable
                  as="input"
                  value={filters.query}
                  onChange={(e: { target: { value: string } }) => set("query", e.target.value)}
                  placeholder="Buscar repuesto, SKU o marca…"
                  style={{
                    width: "100%",
                    height: 54,
                    padding: "0 16px 0 42px",
                    background: "#fff",
                    border: "1px solid transparent",
                    borderRadius: 2,
                    font: "400 15px/1 'IBM Plex Sans',sans-serif",
                    color: "#0A1622",
                    outline: "none",
                  }}
                  focusStyle={{ borderColor: "#0066FF" }}
                />
              </div>
              <a
                href={waLink("Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.")}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  height: 54,
                  padding: "0 22px",
                  background: "#25D366",
                  color: "#062a14",
                  borderRadius: 2,
                  font: "700 14px/1 'IBM Plex Sans',sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: 8, height: 8, background: "#062a14", borderRadius: "50%", display: "inline-block" }} />
                Consultar
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog body */}
      <section style={{ maxWidth: MAX, margin: "0 auto", padding: "36px 40px 90px", display: "grid", gridTemplateColumns: "282px 1fr", gap: 32, alignItems: "start" }}>
        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 90, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* vehicle finder */}
          <div style={{ background: "#fff", border: "1px solid #E4E8ED" }}>
            <div style={{ background: "#0A1622", padding: "15px 18px", display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 7, height: 7, background: "#0066FF", transform: "rotate(45deg)", display: "block" }} />
              <span style={{ font: "600 12.5px/1 'IBM Plex Mono',monospace", letterSpacing: ".1em", color: "#fff" }}>BUSCAR POR VEHÍCULO</span>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={fieldLabel}>MARCA DEL VEHÍCULO</label>
                <div style={{ position: "relative" }}>
                  <select value={filters.vBrand} onChange={(e) => set("vBrand", e.target.value)} style={selectStyle}>
                    <option value="Todas">Todas las marcas</option>
                    {vehicleBrands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <label style={fieldLabel}>AÑO</label>
                <div style={{ position: "relative" }}>
                  <select value={filters.year} onChange={(e) => set("year", e.target.value)} style={selectStyle}>
                    <option value="Todos">Cualquier año</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>
            </div>
          </div>

          {/* vehicle type */}
          <div style={{ background: "#fff", border: "1px solid #E4E8ED", padding: 18 }}>
            <div style={cardLabel}>TIPO DE VEHÍCULO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {VEHICLE_TYPES.map((t) => {
                const active = filters.vtype === t;
                return (
                  <button
                    key={t}
                    onClick={() => set("vtype", t)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 2,
                      cursor: "pointer",
                      font: "600 12.5px/1 'IBM Plex Sans',sans-serif",
                      transition: ".14s",
                      background: active ? "#0066FF" : "#fff",
                      color: active ? "#fff" : "#3A4654",
                      border: active ? "1px solid #0066FF" : "1px solid #DDE3E9",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* category */}
          <div style={{ background: "#fff", border: "1px solid #E4E8ED", padding: 18 }}>
            <div style={cardLabel}>CATEGORÍA</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {categoryCounts.map(({ label, count }) => {
                const active = filters.category === label;
                return (
                  <button
                    key={label}
                    onClick={() => set("category", label)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      height: 38,
                      padding: "0 11px",
                      border: "none",
                      borderRadius: 2,
                      textAlign: "left",
                      cursor: "pointer",
                      font: "600 13.5px/1 'IBM Plex Sans',sans-serif",
                      transition: ".14s",
                      background: active ? "#0A1622" : "transparent",
                      color: active ? "#fff" : "#3A4654",
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ font: "500 11px/1 'IBM Plex Mono',monospace", color: active ? "#7FB0FF" : "#9AA6B3" }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* part brand */}
          <div style={{ background: "#fff", border: "1px solid #E4E8ED", padding: 18 }}>
            <div style={cardLabel}>MARCA DEL REPUESTO</div>
            <div style={{ position: "relative" }}>
              <select value={filters.partBrand} onChange={(e) => set("partBrand", e.target.value)} style={selectStyle}>
                <option value="Todas">Todas las marcas</option>
                {partBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>

          <Hoverable
            as="button"
            onClick={clearFilters}
            style={{
              height: 46,
              background: "transparent",
              border: "1px solid #D7DDE4",
              borderRadius: 2,
              color: "#5A6675",
              font: "600 13px/1 'IBM Plex Sans',sans-serif",
              cursor: "pointer",
            }}
            hoverStyle={{ borderColor: "#0066FF", color: "#0066FF" }}
          >
            Limpiar filtros
          </Hoverable>
        </aside>

        {/* Results */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ font: "400 14px/1 'IBM Plex Sans',sans-serif", color: "#5A6675" }}>
              <strong style={{ fontWeight: 700, color: "#0A1622" }}>{filtered.length}</strong> productos ·{" "}
              <span style={{ font: "500 13px/1 'IBM Plex Mono',monospace", color: "#8A97A6" }}>{activeLabel(filters)}</span>
            </div>
            <div style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#8A97A6", letterSpacing: ".04em" }}>STOCK ACTUALIZADO HOY</div>
          </div>

          {isEmpty && (
            <div style={{ background: "#fff", border: "1px solid #E4E8ED", padding: "70px 30px", textAlign: "center" }}>
              <div style={{ font: "700 20px/1.2 'Archivo',sans-serif", color: "#0A1622", marginBottom: 10 }}>Sin resultados</div>
              <p style={{ font: "400 14.5px/1.6 'IBM Plex Sans',sans-serif", color: "#6B7886", marginBottom: 22 }}>
                No encontramos productos con esos filtros. Escríbenos y lo conseguimos para ti.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={clearFilters}
                  style={{ height: 44, padding: "0 22px", background: "#0A1622", color: "#fff", border: "none", borderRadius: 2, font: "600 13.5px/1 'IBM Plex Sans',sans-serif", cursor: "pointer" }}
                >
                  Limpiar filtros
                </button>
                <a
                  href={waLink("Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.")}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 9, height: 44, padding: "0 22px", background: "#25D366", color: "#062a14", borderRadius: 2, font: "700 13.5px/1 'IBM Plex Sans',sans-serif" }}
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(232px,1fr))", gap: 14 }}>
            {filtered.map((p) => (
              <Hoverable
                key={p.sku}
                style={{ background: "#fff", border: "1px solid #E4E8ED", display: "flex", flexDirection: "column", transition: ".18s" }}
                hoverStyle={{ borderColor: "#0066FF", boxShadow: "0 12px 30px rgba(10,22,34,.08)" }}
              >
                <div
                  style={{
                    aspectRatio: "1.35",
                    background: "#F4F6F8",
                    backgroundImage: "repeating-linear-gradient(135deg,rgba(10,22,34,.05) 0 13px,rgba(10,22,34,0) 13px 26px)",
                    position: "relative",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    padding: 13,
                  }}
                >
                  <span style={availStyle(p.avail)}>{p.avail}</span>
                  <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#0066FF", background: "#fff", border: "1px solid #E4E8ED", padding: "5px 8px" }}>{p.sku}</span>
                </div>
                <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                    <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#9AA6B3", letterSpacing: ".06em" }}>{p.brand}</span>
                    <span style={{ width: 3, height: 3, background: "#CCD4DC", borderRadius: "50%" }} />
                    <span style={{ font: "500 10px/1 'IBM Plex Mono',monospace", color: "#9AA6B3" }}>{p.cat}</span>
                  </div>
                  <h3 style={{ font: "700 16px/1.22 'Archivo',sans-serif", color: "#0A1622", marginBottom: 14, flex: 1 }}>{p.name}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Hoverable
                      as="button"
                      onClick={() => openQuote(p)}
                      style={{ flex: 1, height: 42, background: "#0066FF", color: "#fff", border: "none", borderRadius: 2, font: "700 12.5px/1 'IBM Plex Sans',sans-serif", cursor: "pointer" }}
                      hoverStyle={{ background: "#0a57d0" }}
                    >
                      Cotizar
                    </Hoverable>
                    <Hoverable
                      as="a"
                      href={waLink(`Hola, me interesa: ${p.name} (SKU ${p.sku}). ¿Disponibilidad y precio?`)}
                      target="_blank"
                      rel="noreferrer"
                      title="Consultar por WhatsApp"
                      style={{ width: 42, height: 42, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #D7DDE4", borderRadius: 2 }}
                      hoverStyle={{ borderColor: "#25D366" }}
                    >
                      <span style={{ width: 11, height: 11, background: "#25D366", borderRadius: "50%", display: "block" }} />
                    </Hoverable>
                  </div>
                </div>
              </Hoverable>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#070F18", padding: "56px 0 30px" }}>
        <div
          style={{
            maxWidth: MAX,
            margin: "0 auto",
            padding: "0 40px 34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            borderBottom: "1px solid rgba(255,255,255,.1)",
            marginBottom: 22,
          }}
        >
          <Logo size="footer" innerColor="#070F18" />
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            {[
              { label: "Inicio", href: "/#inicio" },
              { label: "Nosotros", href: "/#nosotros" },
              { label: "Detailing", href: "/#detailing" },
            ].map((l) => (
              <Hoverable key={l.label} as="a" href={l.href} style={{ font: "500 14px/1 'IBM Plex Sans',sans-serif", color: "#AEBECD" }} hoverStyle={{ color: "#fff" }}>
                {l.label}
              </Hoverable>
            ))}
            <Hoverable
              as="a"
              href={waLink()}
              target="_blank"
              rel="noreferrer"
              style={{ font: "500 14px/1 'IBM Plex Sans',sans-serif", color: "#AEBECD" }}
              hoverStyle={{ color: "#fff" }}
            >
              WhatsApp
            </Hoverable>
          </div>
        </div>
        <div style={{ maxWidth: MAX, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <span style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#5E6F80" }}>© 2026 CROW REPUESTOS · TODOS LOS DERECHOS RESERVADOS</span>
          <span style={{ font: "500 12px/1 'IBM Plex Mono',monospace", color: "#5E6F80" }}>{PHONE_DISPLAY} · {EMAIL.toUpperCase()}</span>
        </div>
      </footer>

      <QuoteModal open={modalOpen} onClose={() => setModalOpen(false)} initialDetalle={detalle} />
    </div>
  );
}
