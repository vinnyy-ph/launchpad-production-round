import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { updateMyProfile } from "../services/employees.service";
import type { MyProfileUpdateInput } from "../types/employees.types";

/**
 * Self-service profile edit for the signed-in employee (PATCH /api/v1/employees/me).
 * On success, invalidates the caller's own profile query (and the directory list, since name /
 * contact details may surface there) so every view refreshes.
 */
export function useUpdateMyProfile(employeeId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: MyProfileUpdateInput) => updateMyProfile(input),
    onSuccess: () => {
      if (employeeId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) });
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
