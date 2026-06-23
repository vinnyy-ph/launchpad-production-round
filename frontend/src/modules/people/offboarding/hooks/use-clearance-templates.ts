import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getClearanceTemplates } from "../services/offboarding.service";

/** Clearance template options HR can choose when initiating offboarding. */
export function useClearanceTemplates(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.clearance.templates,
    queryFn: () => getClearanceTemplates(),
    enabled,
  });

  return {
    templates: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
