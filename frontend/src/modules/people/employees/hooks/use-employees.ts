import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getEmployees } from "../services/employees.service";
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
