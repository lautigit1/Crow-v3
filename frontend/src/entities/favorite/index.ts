import { api } from "@/shared/api/client";

export type FavoriteList = {
  product_ids: number[];
  total: number;
};

export const favoriteApi = {
  list: () => api.get<FavoriteList>("/favorites").then((r) => r.data),
  add: (productId: number) => api.post(`/favorites/${productId}`).then(() => undefined),
  remove: (productId: number) => api.delete(`/favorites/${productId}`).then(() => undefined),
};
