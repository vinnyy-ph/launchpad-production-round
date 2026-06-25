import { useQuery } from "@tanstack/react-query";
import { getEmployeeActivityLogs, getMyActivityLogs } from "../services/employees.service";

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

/** Fetches the signed-in employee's OWN profile field edit history (self-service). */
export function useMyActivityLogs(enabled = true) {
  const { data, isLoading } = useQuery({
    queryKey: ["my-activity-logs"],
    queryFn: getMyActivityLogs,
    enabled,
  });

  return {
    logs: data?.data ?? [],
    loading: isLoading,
  };
}
