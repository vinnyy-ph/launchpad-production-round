import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { updateEmployee } from "../services/employees.service";
import type { EmployeeUpdateInput } from "../types/employees.types";

/**
 * HR/Admin employee profile edit (PATCH /api/v1/employees/:id).
 * On success, invalidates the cached profile and directory list so views refresh.
 */
export function useUpdateEmployee(employeeId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: EmployeeUpdateInput) => updateEmployee(employeeId!, input),
    onSuccess: () => {
      if (employeeId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) });
        void queryClient.invalidateQueries({ queryKey: ["employee-activity-logs", employeeId] });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });

  return {
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
