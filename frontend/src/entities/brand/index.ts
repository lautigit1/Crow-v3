import { api } from "@/shared/api/client";

export type Brand = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
};

export type BrandInput = { name: string; slug: string; logo_url?: string | null };

type BrandList = { items: Brand[]; total: number };

export const brandApi = {
  list: () => api.get<BrandList>("/brands").then((r) => r.data.items),
  create: (data: BrandInput) => api.post<Brand>("/brands", data).then((r) => r.data),
  update: (id: number, data: Partial<BrandInput>) => api.patch<Brand>(`/brands/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/brands/${id}`).then(() => undefined),
};
