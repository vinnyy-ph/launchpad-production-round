import { useQuery } from "@tanstack/react-query";
import { getEmployeeActivityLogs } from "../services/employees.service";

export function useEmployeeActivityLogs(employeeId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["employee-activity-logs", employeeId],
    queryFn: () => getEmployeeActivityLogs(employeeId!),
    enabled: !!employeeId,
  });

  return {
    logs: data?.data ?? [],
    loading: isLoading,
  };
}
