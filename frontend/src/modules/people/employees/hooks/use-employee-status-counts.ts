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

  return {
    all: all.meta?.total ?? 0,
    onboarding: onboarding.meta?.total ?? 0,
    offboarding: offboarding.meta?.total ?? 0,
  };
}
