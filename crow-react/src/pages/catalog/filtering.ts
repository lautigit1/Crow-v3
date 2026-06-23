import type { CatalogItem } from "../../types";

export type CatalogFilters = {
  query: string;
  category: string;
  vtype: string;
  vBrand: string;
  year: string;
  partBrand: string;
};

export const INITIAL_FILTERS: CatalogFilters = {
  query: "",
  category: "Todas",
  vtype: "Todos",
  vBrand: "Todas",
  year: "Todos",
  partBrand: "Todas",
};

export const VEHICLE_TYPES = ["Todos", "Autos", "Camiones", "Motos", "Utilitarios"] as const;
export const CATEGORY_TABS = ["Todas", "Autos", "Camiones", "Motos", "Lubricantes", "Baterías", "Filtros", "Detailing", "Accesorios"] as const;

type IgnoreKey = "q" | "category" | "vtype" | "vBrand" | "year" | "partBrand";

/**
 * Returns true if the item passes every active filter. `ignore` lets a single
 * facet be excluded — used so category counts reflect the other filters.
 */
export function matchFilters(p: CatalogItem, f: CatalogFilters, ignore?: IgnoreKey): boolean {
  if (ignore !== "q" && f.query) {
    const q = f.query.toLowerCase();
    const hay = `${p.name} ${p.sku} ${p.brand} ${p.cat}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (ignore !== "category" && f.category !== "Todas" && p.cat !== f.category) return false;
  if (ignore !== "vtype" && f.vtype !== "Todos" && p.vtype !== "Universal" && p.vtype !== f.vtype) return false;
  if (ignore !== "vBrand" && f.vBrand !== "Todas" && p.makes && !p.makes.includes(f.vBrand)) return false;
  if (ignore !== "year" && f.year !== "Todos") {
    const y = parseInt(f.year, 10);
    if (!(p.yf <= y && y <= p.yt)) return false;
  }
  if (ignore !== "partBrand" && f.partBrand !== "Todas" && p.brand !== f.partBrand) return false;
  return true;
}

/** Unique, sorted list of vehicle makes across the catalog. */
export function vehicleBrandsOf(catalog: CatalogItem[]): string[] {
  const set = new Set<string>();
  catalog.forEach((p) => p.makes?.forEach((m) => set.add(m)));
  return [...set].sort();
}

/** Unique, sorted list of part brands across the catalog. */
export function partBrandsOf(catalog: CatalogItem[]): string[] {
  return [...new Set(catalog.map((p) => p.brand))].sort();
}

/** Descending list of model years (2026 → 2008). */
export function yearOptions(): string[] {
  const years: string[] = [];
  for (let y = 2026; y >= 2008; y--) years.push(String(y));
  return years;
}

/** Builds the human-readable summary of the active filters. */
export function activeLabel(f: CatalogFilters): string {
  const bits: string[] = [];
  if (f.category !== "Todas") bits.push(f.category);
  if (f.vtype !== "Todos") bits.push(f.vtype);
  if (f.vBrand !== "Todas") bits.push(f.vBrand);
  if (f.year !== "Todos") bits.push(f.year);
  if (f.partBrand !== "Todas") bits.push(f.partBrand);
  if (f.query) bits.push(`“${f.query}”`);
  return bits.length ? bits.join(" · ") : "Todos los productos";
}
