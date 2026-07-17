import { useQueries, useQuery } from "@tanstack/react-query";
import { productApi, type Product, type ProductQuery } from "./index";

/**
 * Query key factory -- centraliza la forma de las keys para que las
 * mutaciones (crear/editar/borrar producto en el admin) puedan invalidar
 * exactamente lo que corresponde sin repetir arrays a mano en cada lugar.
 */
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params: ProductQuery) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
};

export function useProductsQuery(params: ProductQuery) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productApi.list(params),
    // Mantiene la página anterior visible mientras llega la nueva (evita el
    // parpadeo a skeleton en cada cambio de filtro/página) -- equivalente a
    // `keepPreviousData` de v4.
    placeholderData: (prev) => prev,
  });
}

export function useProductQuery(id: number | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? -1),
    queryFn: () => productApi.get(id as number),
    enabled: id !== undefined,
    retry: false, // un 404 real no debe reintentarse
  });
}

/** Trae varios productos por id en paralelo (ej: página de favoritos). */
export function useProductsByIdsQuery(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: productKeys.detail(id),
      queryFn: () => productApi.get(id),
      retry: false,
    })),
    combine: (results) => ({
      products: results
        .filter((r) => r.status === "success")
        .map((r) => r.data as Product),
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}
