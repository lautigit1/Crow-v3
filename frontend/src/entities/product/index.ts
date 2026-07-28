import { api } from "@/shared/api";
import type { Category } from "@/entities/category";
import type { Brand } from "@/entities/brand";

export type SupplierMin = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number | null;
  // Solo vienen con valor real cuando el que pide es un admin logueado --
  // para cualquier otro caller el backend los devuelve en null aunque
  // haya datos cargados (ver backend/app/api/routes/products.py).
  cost_price?: number | null;
  margin_pct?: number | null;
  stock: number;
  image_url: string | null;
  vehicle_type: string;
  is_featured: boolean;
  /** Publicado en el catálogo. `false` = borrador: cargado pero invisible
   *  para el público. Distinto de `is_deleted`, que es la papelera. */
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  category_id: number | null;
  brand_id: number | null;
  supplier_id: number | null;
  category: Category | null;
  brand: Brand | null;
  supplier: SupplierMin | null;
  created_at: string;
  updated_at: string;
};

export type ProductList = { items: Product[]; total: number };

export type ProductInput = {
  name: string;
  sku: string;
  description?: string | null;
  price?: number | null;
  cost_price?: number | null;
  margin_pct?: number | null;
  stock?: number;
  image_url?: string | null;
  vehicle_type?: string;
  is_featured?: boolean;
  is_active?: boolean;
  category_id?: number | null;
  brand_id?: number | null;
  supplier_id?: number | null;
};

export type ProductSort = "recent" | "name" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc";

export type ProductQuery = {
  q?: string;
  category_id?: number;
  brand_id?: number;
  supplier_id?: number;
  vehicle_type?: string;
  in_stock?: boolean;
  featured?: boolean;
  /** Solo tiene efecto para un admin logueado -- el backend lo ignora para
   *  el público, si no sería una forma de listar lo que no está publicado. */
  is_active?: boolean;
  sort?: ProductSort;
  skip?: number;
  limit?: number;
};

export type StockMovement = {
  id: number;
  /** Positivo entra, negativo sale. */
  delta: number;
  /** Stock resultante en ese momento. Se guarda en vez de recalcularse:
   *  el historial arranca con la migración 014, así que para productos
   *  anteriores la suma de los deltas no da el stock actual. */
  stock_after: number;
  reason: string;
  note: string | null;
  order_id: number | null;
  created_at: string;
};

export type ProductBulkResult = {
  updated: number;
  /** Ids que se pidieron pero no se tocaron: no existen o están en la
   *  papelera. Se devuelven en vez de fallar toda la operación. */
  skipped: number[];
};

export const productApi = {
  list: (params: ProductQuery = {}) =>
    api.get<ProductList>("/products", { params }).then((r) => r.data),
  listDeleted: (params: { skip?: number; limit?: number } = {}) =>
    api.get<ProductList>("/products/deleted", { params }).then((r) => r.data),
  get: (id: number) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: ProductInput) => api.post<Product>("/products", data).then((r) => r.data),
  update: (id: number, data: Partial<ProductInput>) => api.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then(() => undefined),
  restore: (id: number) => api.patch<Product>(`/products/${id}/restore`).then((r) => r.data),
  /** Publica o despublica varios de una. Lo usan el panel del proveedor y la
   *  tabla de productos, por eso recibe ids y no un proveedor. */
  stockMovements: (id: number) =>
    api.get<StockMovement[]>(`/products/${id}/stock-movements`).then((r) => r.data),
  bulkActive: (ids: number[], is_active: boolean) =>
    api.patch<ProductBulkResult>("/products/bulk", { ids, is_active }).then((r) => r.data),
};
