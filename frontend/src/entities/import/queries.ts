import { useQuery } from "@tanstack/react-query";
import { importApi } from "./index";

export const importKeys = {
  all: ["imports"] as const,
  list: (limit: number) => [...importKeys.all, "list", limit] as const,
};

export function useImportsQuery(limit: number) {
  return useQuery({
    queryKey: importKeys.list(limit),
    queryFn: () => importApi.list({ limit }),
  });
}
