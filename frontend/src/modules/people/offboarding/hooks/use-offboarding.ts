import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  getMyOffboarding,
  getOffboarding,
  getOffboardings,
} from "../services/offboarding.service";

/** HR (all) / supervisor (downward chain) list of offboarding cases. */
export function useOffboardings(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.offboarding.list,
    queryFn: () => getOffboardings(),
    enabled,
  });

  return {
    offboardings: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** One offboarding case detail by id. */
export function useOffboarding(id: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.offboarding.detail(id ?? ""),
    queryFn: () => getOffboarding(id!),
    enabled: Boolean(id),
  });

  return {
    offboarding: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** The signed-in employee's own offboarding case (null when none). */
export function useMyOffboarding(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.offboarding.mine,
    queryFn: () => getMyOffboarding(),
    enabled,
  });

  return {
    // `data === undefined` while loading; `null` is a real "no active case".
    offboarding: data === undefined ? null : data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
