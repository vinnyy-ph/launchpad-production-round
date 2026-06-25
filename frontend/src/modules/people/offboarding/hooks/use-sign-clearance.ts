import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  getAssignedClearances,
  rejectClearance,
  replaceClearanceSignatory,
  resetClearance,
  signClearance,
} from "../services/offboarding.service";
import type { ClearanceAction } from "../types/offboarding.types";

/** Clearance requests where the signed-in user is the signatory. */
export function useAssignedClearances(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.clearance.assigned,
    queryFn: () => getAssignedClearances(),
    enabled,
  });

  return {
    clearances: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** Invalidate every view a clearance action can change. */
function invalidateAfterAction(queryClient: QueryClient, action: ClearanceAction) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.assigned });
  void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.detail(action.offboardingId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.list });
  void queryClient.invalidateQueries({ queryKey: queryKeys.offboarding.mine });
  // Completing the last clearance deactivates the employee.
  if (action.employeeInactivated) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
  }
}

/** Signs a clearance request with a captured signature image and optional note. */
export function useSignClearance() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; signatureImage: string; note?: string }) =>
      signClearance(vars.requestId, vars.signatureImage, vars.note),
    onSuccess: (action) => invalidateAfterAction(queryClient, action),
  });
  return {
    sign: mutation.mutateAsync,
    signing: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/** Rejects a clearance request (note required). */
export function useRejectClearance() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; note: string }) =>
      rejectClearance(vars.requestId, vars.note),
    onSuccess: (action) => invalidateAfterAction(queryClient, action),
  });
  return {
    reject: mutation.mutateAsync,
    rejecting: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/** Resets a clearance request back to pending (ADMIN/HR or that signatory). */
export function useResetClearance() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (requestId: string) => resetClearance(requestId),
    onSuccess: (action) => invalidateAfterAction(queryClient, action),
  });
  return {
    reset: mutation.mutateAsync,
    resetting: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/** Replaces the signatory on an in-progress clearance item (ADMIN/HR). */
export function useReplaceClearanceSignatory() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; newSignatoryId: string }) =>
      replaceClearanceSignatory(vars.requestId, vars.newSignatoryId),
    onSuccess: (action) => invalidateAfterAction(queryClient, action),
  });
  return {
    replace: mutation.mutateAsync,
    replacing: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
