import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { completeOnboarding } from "../services/onboarding.service";

/** HR marks an employee's onboarding complete (flips them to Active). */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => completeOnboarding(employeeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
