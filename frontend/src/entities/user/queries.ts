import { useQuery } from "@tanstack/react-query";
import { userApi } from "./index";

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
};

export function useUsersQuery() {
  return useQuery({ queryKey: userKeys.list(), queryFn: () => userApi.list() });
}
