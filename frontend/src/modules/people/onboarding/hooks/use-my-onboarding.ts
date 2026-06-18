import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  loadMyOnboardingStatus,
  submitCustomFields,
  submitDocument,
  submitMyOnboardingForReview,
  updateMyProfile,
} from "../services/onboarding.service";
import type { SubmitCustomFieldAnswer, UpdateMyProfileInput } from "../types/onboarding.types";

/** The signed-in employee's own onboarding checklist. */
export function useMyOnboarding(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.onboarding.mine,
    queryFn: () => loadMyOnboardingStatus(),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
    },
  });
}

/** Employee confirms or updates HR pre-filled profile data. */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMyProfileInput) => updateMyProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
    },
  });
}

/** Employee uploads (or re-uploads) a required document. */
export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { documentId: string; file: File }) =>
      submitDocument(vars.documentId, vars.file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
    },
  });
}

/** Employee submits onboarding to HR for review (does not self-activate). */
export function useSubmitMyOnboardingForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitMyOnboardingForReview(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
    },
  });
}
