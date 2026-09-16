import { useQuery } from "@tanstack/react-query";
import { dashboardApi, type TrendPeriod } from "./index";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  analytics: () => [...dashboardKeys.all, "analytics"] as const,
  trends: (period: TrendPeriod) => [...dashboardKeys.all, "trends", period] as const,
};

export function useDashboardStatsQuery() {
  return useQuery({ queryKey: dashboardKeys.stats(), queryFn: () => dashboardApi.stats() });
}

export function useAnalyticsQuery() {
  return useQuery({ queryKey: dashboardKeys.analytics(), queryFn: () => dashboardApi.analytics() });
}

export function useTrendsQuery(period: TrendPeriod) {
  return useQuery({
    queryKey: dashboardKeys.trends(period),
    queryFn: () => dashboardApi.trends(period),
    // Al cambiar de período se sigue viendo el gráfico anterior hasta que
    // llega el nuevo, en vez de parpadear a vacío.
    placeholderData: (prev) => prev,
  });
}
