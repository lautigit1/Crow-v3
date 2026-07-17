import { useQuery } from "@tanstack/react-query";
import { brandApi } from "./index";

export const brandKeys = {
  all: ["brands"] as const,
  list: () => [...brandKeys.all, "list"] as const,
};

export function useBrandsQuery() {
  return useQuery({
    queryKey: brandKeys.list(),
    queryFn: () => brandApi.list(),
    staleTime: 5 * 60_000, // mismo criterio que categorías -- cambia poco
  });
}
