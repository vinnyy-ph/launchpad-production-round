import { useQuery } from "@tanstack/react-query";
import { getEmployeeDocuments } from "../services/employees.service";

export function useEmployeeDocuments(employeeId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["employee-documents", employeeId],
    queryFn: () => getEmployeeDocuments(employeeId!),
    enabled: !!employeeId,
  });

  return {
    documents: data?.data ?? [],
    loading: isLoading,
  };
}
