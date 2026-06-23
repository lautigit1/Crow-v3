/** A featured product shown on the landing page grid. */
export type FeaturedProduct = {
  tag: string;
  name: string;
  brand: string;
  cat: string;
  blurb: string;
};

/** Availability state for a catalog item. */
export type Availability = "En stock" | "Bajo pedido";

/** A full catalog entry used by the filterable catalog page. */
export type CatalogItem = {
  name: string;
  sku: string;
  brand: string;
  cat: string;
  vtype: string;
  avail: Availability;
  /** Compatible vehicle makes, or null when the item is universal. */
  makes: string[] | null;
  /** Year-from / year-to compatibility range. */
  yf: number;
  yt: number;
};
