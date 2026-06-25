import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { approveDocument, rejectDocument } from "../services/onboarding.service";

/** HR approves a pending document submission. */
export function useApproveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => approveDocument(submissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}

/** HR rejects a pending document submission with a note. */
export function useRejectDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { submissionId: string; rejectionNote: string }) =>
      rejectDocument(vars.submissionId, vars.rejectionNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}
