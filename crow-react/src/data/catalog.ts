import type { CatalogItem } from "../types";

/** The eight top-level product categories, used across the site. */
export const CATEGORIES = [
  "Autos",
  "Camiones",
  "Motos",
  "Lubricantes",
  "Baterías",
  "Filtros",
  "Detailing",
  "Accesorios",
] as const;

/** Full product catalog backing the filterable catalog page. */
export const CATALOG: CatalogItem[] = [
  { name: "Pastillas de Freno Cerámicas", sku: "BRK-204", brand: "FrenoTech", cat: "Autos", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Chevrolet", "Renault", "Mazda", "Nissan", "Kia", "Ford"], yf: 2012, yt: 2023 },
  { name: "Kit de Embrague Reforzado", sku: "CLT-118", brand: "AutoPro", cat: "Autos", vtype: "Autos", avail: "Bajo pedido", makes: ["Chevrolet", "Renault", "Nissan", "Ford"], yf: 2010, yt: 2020 },
  { name: "Amortiguador Delantero", sku: "SUS-210", brand: "RodaMax", cat: "Autos", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Mazda", "Kia", "Nissan"], yf: 2013, yt: 2024 },
  { name: "Bujías de Iridio (juego x4)", sku: "IGN-044", brand: "Crow Select", cat: "Autos", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Chevrolet", "Mazda", "Ford", "Kia"], yf: 2014, yt: 2024 },
  { name: "Bomba de Agua", sku: "COO-301", brand: "AutoPro", cat: "Autos", vtype: "Autos", avail: "Bajo pedido", makes: ["Renault", "Chevrolet", "Nissan"], yf: 2011, yt: 2021 },
  { name: "Radiador de Aluminio", sku: "COO-118", brand: "Crow Select", cat: "Autos", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Chevrolet", "Kia"], yf: 2012, yt: 2022 },
  { name: "Correa de Distribución", sku: "TIM-076", brand: "AutoPro", cat: "Autos", vtype: "Autos", avail: "En stock", makes: ["Renault", "Mazda", "Ford", "Nissan"], yf: 2010, yt: 2019 },
  { name: "Sensor de Oxígeno", sku: "ELE-233", brand: "Crow Select", cat: "Autos", vtype: "Autos", avail: "Bajo pedido", makes: ["Toyota", "Chevrolet", "Kia", "Ford"], yf: 2013, yt: 2023 },

  { name: "Amortiguadores Heavy Duty", sku: "SUS-336", brand: "TruckLine", cat: "Camiones", vtype: "Camiones", avail: "En stock", makes: ["Hino", "Foton", "JAC", "Chevrolet"], yf: 2012, yt: 2024 },
  { name: "Filtro de Combustible Diésel", sku: "FLT-410", brand: "FilterTech", cat: "Filtros", vtype: "Camiones", avail: "En stock", makes: ["Hino", "Foton", "JAC"], yf: 2010, yt: 2024 },
  { name: "Pastillas de Freno Carga Pesada", sku: "BRK-560", brand: "TruckLine", cat: "Camiones", vtype: "Camiones", avail: "Bajo pedido", makes: ["Hino", "Foton", "Chevrolet"], yf: 2011, yt: 2023 },
  { name: "Kit de Reparación de Turbo", sku: "TUR-090", brand: "TruckLine", cat: "Camiones", vtype: "Camiones", avail: "Bajo pedido", makes: ["Hino", "Foton", "JAC"], yf: 2012, yt: 2022 },

  { name: "Kit de Transmisión (cadena y piñón)", sku: "MOT-091", brand: "MotoMax", cat: "Motos", vtype: "Motos", avail: "En stock", makes: ["Yamaha", "Honda", "Bajaj", "AKT"], yf: 2014, yt: 2024 },
  { name: "Pastillas de Freno Moto", sku: "MOT-114", brand: "MotoMax", cat: "Motos", vtype: "Motos", avail: "En stock", makes: ["Yamaha", "Honda", "Bajaj", "AKT"], yf: 2013, yt: 2024 },
  { name: "Kit de Arrastre Reforzado", sku: "MOT-220", brand: "MotoMax", cat: "Motos", vtype: "Motos", avail: "Bajo pedido", makes: ["Yamaha", "Honda", "Bajaj"], yf: 2012, yt: 2023 },
  { name: "Batería de Moto 12V · 7Ah", sku: "BAT-120", brand: "PowerCell", cat: "Baterías", vtype: "Motos", avail: "En stock", makes: ["Yamaha", "Honda", "Bajaj", "AKT"], yf: 2010, yt: 2026 },

  { name: "Aceite Sintético 5W-30", sku: "OIL-530", brand: "LubriMax", cat: "Lubricantes", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },
  { name: "Aceite Mineral 20W-50", sku: "OIL-205", brand: "LubriMax", cat: "Lubricantes", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },
  { name: "Aceite Diésel 15W-40", sku: "OIL-154", brand: "LubriMax", cat: "Lubricantes", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },
  { name: "Refrigerante Concentrado", sku: "COO-500", brand: "LubriMax", cat: "Lubricantes", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },

  { name: "Batería 12V · 70Ah", sku: "BAT-700", brand: "PowerCell", cat: "Baterías", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Chevrolet", "Renault", "Mazda", "Nissan", "Kia", "Ford"], yf: 2005, yt: 2026 },
  { name: "Batería 12V · 100Ah", sku: "BAT-100", brand: "PowerCell", cat: "Baterías", vtype: "Camiones", avail: "Bajo pedido", makes: ["Hino", "Foton", "JAC"], yf: 2005, yt: 2026 },

  { name: "Filtro de Aceite Premium", sku: "FLT-052", brand: "FilterTech", cat: "Filtros", vtype: "Universal", avail: "En stock", makes: null, yf: 2008, yt: 2026 },
  { name: "Filtro de Aire", sku: "FLT-088", brand: "FilterTech", cat: "Filtros", vtype: "Universal", avail: "En stock", makes: null, yf: 2008, yt: 2026 },
  { name: "Filtro de Cabina", sku: "FLT-099", brand: "FilterTech", cat: "Filtros", vtype: "Autos", avail: "Bajo pedido", makes: ["Toyota", "Chevrolet", "Mazda", "Kia"], yf: 2012, yt: 2026 },

  { name: "Cera Cerámica en Spray", sku: "DET-410", brand: "CeraShield", cat: "Detailing", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },
  { name: "Shampoo pH Neutro 1L", sku: "DET-115", brand: "CeraShield", cat: "Detailing", vtype: "Universal", avail: "En stock", makes: null, yf: 2000, yt: 2026 },
  { name: "Recubrimiento Cerámico 9H", sku: "DET-900", brand: "CeraShield", cat: "Detailing", vtype: "Universal", avail: "Bajo pedido", makes: null, yf: 2000, yt: 2026 },

  { name: "Juego de Tapetes a Medida", sku: "ACC-330", brand: "Crow Select", cat: "Accesorios", vtype: "Autos", avail: "En stock", makes: ["Toyota", "Chevrolet", "Renault", "Mazda", "Nissan", "Kia", "Ford"], yf: 2010, yt: 2026 },
  { name: "Cargador / Mantenedor de Batería", sku: "ACC-451", brand: "PowerCell", cat: "Accesorios", vtype: "Universal", avail: "Bajo pedido", makes: null, yf: 2000, yt: 2026 },
];
