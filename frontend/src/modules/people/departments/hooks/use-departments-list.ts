import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getDepartmentsPage } from "../services/departments.service";
import type { DepartmentFilters } from "../types/departments.types";

/** Paginated, searchable, sortable department list for the HR management table. */
export function useDepartmentsList(filters: DepartmentFilters = {}) {
  const query = useQuery({
    queryKey: queryKeys.departments.table(filters as Record<string, unknown>),
    queryFn: () => getDepartmentsPage(filters),
    placeholderData: keepPreviousData,
  });

  return {
    departments: query.data?.data ?? [],
    meta: query.data?.meta ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
