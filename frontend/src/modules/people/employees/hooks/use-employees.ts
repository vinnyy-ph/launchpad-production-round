import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getAllEmployees, getEmployees } from "../services/employees.service";
import type { EmployeeFilters } from "../types/employees.types";

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
 * The entire directory in one non-paginated query (org chart). Unlike `useEmployees`, this is
 * not capped at a page size, so the supervisor tree can be built from the full set.
 */
export function useAllEmployees(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.employees.allList,
    queryFn: () => getAllEmployees(),
    enabled,
  });

  return {
    employees: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
