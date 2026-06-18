import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getEmployeeProfile } from "../services/employees.service";

export function useEmployeeProfile(employeeId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: employeeId ? queryKeys.employees.detail(employeeId) : queryKeys.employees.detail(""),
    queryFn: () => getEmployeeProfile(employeeId!),
    enabled: Boolean(employeeId),
  });

  return {
    employee: data?.data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}
