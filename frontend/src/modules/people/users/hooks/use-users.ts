import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getUsers } from "../services/users.service";
import type { UserFilters } from "../types/users.types";

export function useUsers(filters: UserFilters = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.users.list(filters as Record<string, unknown>),
    queryFn: () => getUsers(filters),
  });

  return {
    users: data?.data ?? [],
    meta: data?.meta ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
