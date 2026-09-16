import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { quoteApi } from "./index";

export const quoteKeys = {
  all: ["quotes"] as const,
  adminList: () => [...quoteKeys.all, "admin"] as const,
  mine: () => [...quoteKeys.all, "mine"] as const,
};

/** Cotizaciones propias, de a `pageSize`, con "cargar más". */
export function useMyQuotesInfiniteQuery(pageSize: number) {
  return useInfiniteQuery({
    queryKey: quoteKeys.mine(),
    queryFn: ({ pageParam }) => quoteApi.mine({ skip: pageParam, limit: pageSize }),
    initialPageParam: 0,
    getNextPageParam: (ultima, paginas) => {
      const cargadas = paginas.reduce((n, p) => n + p.items.length, 0);
      return cargadas < ultima.total ? cargadas : undefined;
    },
  });
}

export function useAdminQuotesQuery() {
  return useQuery({ queryKey: quoteKeys.adminList(), queryFn: () => quoteApi.listAll() });
}
