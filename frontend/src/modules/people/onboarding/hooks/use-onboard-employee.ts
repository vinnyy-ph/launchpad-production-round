import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { onboardEmployee } from "../services/onboarding.service";
import type { OnboardEmployeeInput } from "../types/onboarding.types";

/** HR creates a new employee and starts their onboarding (sends an invitation). */
export function useOnboardEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardEmployeeInput) => onboardEmployee(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
