import { useEmployees } from "./use-employees";

/**
 * Provides employee counts for the directory tabs (All / Onboarding / Offboarding).
 * Each count is a lightweight list query (limit 1) read from the pagination total,
 * so the tab badges stay accurate independently of the active tab's data.
 */
export function useEmployeeStatusCounts() {
  const all = useEmployees({ limit: 1 });
  const onboarding = useEmployees({ status: "onboarding", limit: 1 });
  const offboarding = useEmployees({ status: "offboarding", limit: 1 });

  // Undefined while a count is still loading so the tab badge stays hidden
  // instead of flashing a misleading 0 before the real total resolves.
  return {
    all: all.loading ? undefined : (all.meta?.total ?? 0),
    onboarding: onboarding.loading ? undefined : (onboarding.meta?.total ?? 0),
    offboarding: offboarding.loading ? undefined : (offboarding.meta?.total ?? 0),
  };
}
