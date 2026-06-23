import type { FeaturedProduct } from "../types";

/** Filter labels for the featured-products section on the landing page. */
export const FEATURED_FILTERS = [
  "Todos",
  "Autos",
  "Camiones",
  "Motos",
  "Lubricantes",
  "Baterías",
  "Filtros",
  "Detailing",
  "Accesorios",
] as const;

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    tag: "BRK-204",
    name: "Pastillas de Freno Cerámicas",
    brand: "LÍNEA FRENOS",
    cat: "Autos",
    blurb: "Frenado estable y baja generación de polvo.",
  },
  {
    tag: "CLT-118",
    name: "Kit de Embrague Reforzado",
    brand: "TRANSMISIÓN",
    cat: "Autos",
    blurb: "Disco, prensa y balinera de alto desempeño.",
  },
  {
    tag: "FLT-052",
    name: "Filtro de Aceite Premium",
    brand: "FILTRACIÓN",
    cat: "Filtros",
    blurb: "Mayor retención de partículas y caudal constante.",
  },
  {
    tag: "BAT-700",
    name: "Batería 12V · 70Ah",
    brand: "ENERGÍA",
    cat: "Baterías",
    blurb: "Arranque confiable en alta y baja temperatura.",
  },
  {
    tag: "OIL-530",
    name: "Aceite Sintético 5W-30",
    brand: "LUBRICACIÓN",
    cat: "Lubricantes",
    blurb: "Protección total del motor en uso exigente.",
  },
  {
    tag: "SUS-336",
    name: "Amortiguadores Heavy Duty",
    brand: "SUSPENSIÓN",
    cat: "Camiones",
    blurb: "Diseñados para carga y trabajo continuo.",
  },
  {
    tag: "MOT-091",
    name: "Kit de Transmisión Moto",
    brand: "LÍNEA MOTO",
    cat: "Motos",
    blurb: "Cadena, piñón y sprocket de larga vida.",
  },
  {
    tag: "DET-410",
    name: "Cera Cerámica Spray",
    brand: "DETAILING",
    cat: "Detailing",
    blurb: "Brillo profundo y protección hidrofóbica.",
  },
  {
    tag: "INT-225",
    name: "Kit Limpieza Interior",
    brand: "DETAILING",
    cat: "Accesorios",
    blurb: "Cuidado completo de tapizados y plásticos.",
  },
];
