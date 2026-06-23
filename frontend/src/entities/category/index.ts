import { api } from "@/shared/api/client";

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type CategoryInput = { name: string; slug: string; description?: string | null };

type CategoryList = { items: Category[]; total: number };

export const categoryApi = {
  list: () => api.get<CategoryList>("/categories").then((r) => r.data.items),
  create: (data: CategoryInput) => api.post<Category>("/categories", data).then((r) => r.data),
  update: (id: number, data: Partial<CategoryInput>) => api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`).then(() => undefined),
};
