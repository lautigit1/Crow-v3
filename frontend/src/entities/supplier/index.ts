import { api } from "@/shared/api/client";

export type Supplier = {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  notes: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type SupplierList = { items: Supplier[]; total: number };

export type SupplierInput = {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

export type SupplierQuery = {
  q?: string;
  active_only?: boolean;
  skip?: number;
  limit?: number;
};

export const supplierApi = {
  list: (params: SupplierQuery = {}) =>
    api.get<SupplierList>("/suppliers", { params }).then((r) => r.data),
  get: (id: number) => api.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),
  create: (data: SupplierInput) => api.post<Supplier>("/suppliers", data).then((r) => r.data),
  update: (id: number, data: Partial<SupplierInput>) =>
    api.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/suppliers/${id}`).then(() => undefined),
};
