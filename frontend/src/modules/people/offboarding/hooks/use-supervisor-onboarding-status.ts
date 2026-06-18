import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getSupervisorOnboardingStatus } from "../services/offboarding.service";

/**
 * Read-only consume of the onboarding side of a supervisor's downward chain
 * (GET /api/v1/supervisor-onboarding/status). Used to merge with the offboarding
 * list on the supervisor status screen. The producing endpoint is owned by the
 * People module — this hook only reads it.
 */
export function useSupervisorOnboardingStatus(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.supervisorOnboarding.status,
    queryFn: () => getSupervisorOnboardingStatus(),
    enabled,
  });

  return {
    employees: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
