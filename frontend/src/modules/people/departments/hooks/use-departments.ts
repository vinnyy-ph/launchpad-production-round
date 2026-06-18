import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getDepartments } from "../services/departments.service";

/** Department options for HR employee edit forms. */
export function useDepartments() {
  const query = useQuery({
    queryKey: queryKeys.departments.list,
    queryFn: getDepartments,
  });

  return {
    departments: query.data?.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
