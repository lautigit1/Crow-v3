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
  deleted: (params: { skip?: number; limit?: number }) => [...productKeys.all, "deleted", params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  stockMovements: (id: number) => [...productKeys.all, "stock-movements", id] as const,
  inventory: () => [...productKeys.all, "inventory"] as const,
};

// Tope real del backend en GET /products (`le=100` en products.py). Pedir más
// en una sola llamada devuelve 422, así que el inventario completo se trae en
// bloques de este tamaño en vez de asumir que entra en una sola página.
const INVENTORY_PAGE = 100;

async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];
  let skip = 0;
  for (;;) {
    const r = await productApi.list({ limit: INVENTORY_PAGE, skip });
    all.push(...r.items);
    skip += r.items.length;
    if (r.items.length === 0 || skip >= r.total) break;
  }
  return all;
}

/** El catálogo entero, para la vista de inventario. */
export function useInventoryQuery() {
  return useQuery({ queryKey: productKeys.inventory(), queryFn: fetchAllProducts });
}

export function useProductsQuery(params: ProductQuery, enabled = true) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productApi.list(params),
    enabled,
    // Mantiene la página anterior visible mientras llega la nueva (evita el
    // parpadeo a skeleton en cada cambio de filtro/página) -- equivalente a
    // `keepPreviousData` de v4.
    placeholderData: (prev) => prev,
  });
}

/** Papelera del panel: productos borrados, más nuevos primero. */
export function useDeletedProductsQuery(params: { skip?: number; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: productKeys.deleted(params),
    queryFn: () => productApi.listDeleted(params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useStockMovementsQuery(productId: number) {
  return useQuery({
    queryKey: productKeys.stockMovements(productId),
    queryFn: () => productApi.stockMovements(productId),
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
