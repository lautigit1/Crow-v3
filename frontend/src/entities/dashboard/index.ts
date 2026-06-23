import { api } from "@/shared/api/client";
import type { Quote } from "@/entities/quote";

export type DashboardStats = {
  total_products: number;
  out_of_stock: number;
  pending_quotes: number;
  registered_users: number;
  total_categories: number;
  total_brands: number;
  total_suppliers: number;
  active_suppliers: number;
  recent_quotes: Quote[];
};

export type NamedCount = { label: string; value: number };

export type Analytics = {
  products_by_category: NamedCount[];
  products_by_supplier: NamedCount[];
  quotes_by_status: NamedCount[];
  products_by_vehicle: NamedCount[];
  stock: { in_stock: number; low_stock: number; out_of_stock: number };
  inventory_value: number;
};

export const dashboardApi = {
  stats: () => api.get<DashboardStats>("/dashboard").then((r) => r.data),
  analytics: () => api.get<Analytics>("/dashboard/analytics").then((r) => r.data),
};
