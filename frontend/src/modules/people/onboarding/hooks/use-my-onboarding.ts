import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  completeMyOnboarding,
  getMyOnboardingStatus,
  submitCustomFields,
  submitDocument,
} from "../services/onboarding.service";
import type { SubmitCustomFieldAnswer } from "../types/onboarding.types";

/** The signed-in employee's own onboarding checklist. */
export function useMyOnboarding(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.onboarding.mine,
    queryFn: () => getMyOnboardingStatus(),
    enabled,
  });

  return {
    status: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** Employee submits their custom field answers. */
export function useSubmitCustomFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: SubmitCustomFieldAnswer[]) => submitCustomFields(fields),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.onboarding.mine, data),
  });
}

/** Employee uploads (or re-uploads) a required document. */
export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { documentId: string; fileUrl: string }) =>
      submitDocument(vars.documentId, vars.fileUrl),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.onboarding.mine, data),
  });
}

/** Employee marks their own onboarding complete. */
export function useCompleteMyOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => completeMyOnboarding(),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.onboarding.mine, data),
  });
}
