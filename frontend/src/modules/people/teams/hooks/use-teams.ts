import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getTeams } from "../services/teams.service";
import type { TeamFilters } from "../types/teams.types";

export function useTeams(filters: TeamFilters = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.teams.list(filters as Record<string, unknown>),
    queryFn: () => getTeams(filters),
  });

  return {
    teams: data?.data ?? [],
    meta: data?.meta ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
