import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getAllEmployees, getEmployees } from "../services/employees.service";
import type { EmployeeFilters, EmployeeStatus } from "../types/employees.types";

export function useEmployees(filters: EmployeeFilters = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.employees.list(filters as Record<string, unknown>),
    queryFn: () => getEmployees(filters),
  });

  return {
    employees: data?.data ?? [],
    meta: data?.meta ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/**
 * The entire directory in one non-paginated query. Unlike `useEmployees`, this is not capped at a
 * page size, so the org chart's supervisor tree — and every employee picker across the app — can
 * be built from the full set instead of a single page.
 *
 * @param options.status When set, narrows the returned list to that employee status (filtered
 *   client-side off the single cached payload, e.g. `"active"` for selection dropdowns).
 * @param options.enabled Set false to defer the fetch (e.g. while a dialog is closed).
 */
export function useAllEmployees(options: { status?: EmployeeStatus; enabled?: boolean } = {}) {
  const { status, enabled = true } = options;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.employees.allList,
    queryFn: () => getAllEmployees(),
    enabled,
  });

  const all = data ?? [];

  return {
    employees: status ? all.filter((employee) => employee.status === status) : all,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
