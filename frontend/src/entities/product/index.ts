import { api } from "@/shared/api/client";
import type { Category } from "@/entities/category";
import type { Brand } from "@/entities/brand";

export type SupplierMin = { id: number; name: string };

export type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number | null;
  stock: number;
  image_url: string | null;
  vehicle_type: string;
  is_featured: boolean;
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
  stock?: number;
  image_url?: string | null;
  vehicle_type?: string;
  is_featured?: boolean;
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
  sort?: ProductSort;
  skip?: number;
  limit?: number;
};

export const productApi = {
  list: (params: ProductQuery = {}) =>
    api.get<ProductList>("/products", { params }).then((r) => r.data),
  get: (id: number) => api.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: ProductInput) => api.post<Product>("/products", data).then((r) => r.data),
  update: (id: number, data: Partial<ProductInput>) => api.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then(() => undefined),
};
