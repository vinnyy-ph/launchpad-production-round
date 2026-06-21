import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  commitBulkOnboarding,
  previewBulkOnboarding,
} from "../services/onboarding.service";
import type { BulkOnboardingRowInput } from "../types/onboarding.types";

export function useBulkOnboardingPreview() {
  return useMutation({
    mutationFn: (rows: BulkOnboardingRowInput[]) => previewBulkOnboarding(rows),
  });
}

export function useBulkOnboardingCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: BulkOnboardingRowInput[]) => commitBulkOnboarding(rows),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
