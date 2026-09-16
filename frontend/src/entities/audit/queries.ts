import { useQuery } from "@tanstack/react-query";
import { auditApi } from "./index";

export const auditKeys = {
  all: ["audit"] as const,
  list: (limit: number) => [...auditKeys.all, "list", limit] as const,
};

export function useAuditLogQuery(limit = 150) {
  return useQuery({
    queryKey: auditKeys.list(limit),
    queryFn: () => auditApi.list(limit),
  });
}
