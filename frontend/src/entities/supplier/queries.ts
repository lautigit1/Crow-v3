import { useQuery } from "@tanstack/react-query";
import { supplierApi, type SupplierQuery } from "./index";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params: SupplierQuery) => [...supplierKeys.lists(), params] as const,
};

export function useSuppliersQuery(params: SupplierQuery) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => supplierApi.list(params),
    placeholderData: (prev) => prev,
  });
}
