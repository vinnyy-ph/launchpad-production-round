import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { initiateOffboarding, reassignOffboarding } from "../services/offboarding.service";
import type { InitiateOffboardingInput } from "../types/offboarding.types";

/**
 * Initiates an offboarding (ADMIN/HR). On success, invalidates the offboarding list
 * and the employee directory (the offboardee flips to Offboarding).
 */
export function useCreateOffboarding() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: InitiateOffboardingInput) => initiateOffboarding(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });

  return {
    create: mutation.mutateAsync,
    creating: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/**
 * Reassigns the offboardee's direct reports + led teams to a new supervisor (ADMIN/HR).
 * On success, invalidates this case's detail, the list, the employee directory, and teams.
 */
export function useReassignOffboarding(offboardingId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newSupervisorId: string) => reassignOffboarding(offboardingId!, newSupervisorId),
    onSuccess: () => {
      if (offboardingId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.detail(offboardingId) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.list });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  return {
    reassign: mutation.mutateAsync,
    reassigning: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
