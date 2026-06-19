import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  createDocumentConfig,
  deleteDocumentConfig,
  getDocumentConfigs,
  updateDocumentConfig,
} from "../services/onboarding.service";
import type {
  CreateDocumentConfigInput,
  OnboardingDocumentConfig,
  UpdateDocumentConfigInput,
} from "../types/onboarding.types";

/** Org-wide required onboarding documents configured by HR. */
export function useDocumentConfigs() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.onboarding.documentConfigs,
    queryFn: () => getDocumentConfigs(),
  });

  return {
    documents: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** Creates a required onboarding document config. */
export function useCreateDocumentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocumentConfigInput) => createDocumentConfig(input),
    onSuccess: (created) => {
      queryClient.setQueryData<OnboardingDocumentConfig[]>(
        queryKeys.onboarding.documentConfigs,
        (prev) => [...(prev ?? []), created],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

/** Updates a required onboarding document config. */
export function useUpdateDocumentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateDocumentConfigInput }) =>
      updateDocumentConfig(vars.id, vars.input),
    onSuccess: (updated) => {
      queryClient.setQueryData<OnboardingDocumentConfig[]>(
        queryKeys.onboarding.documentConfigs,
        (prev) => (prev ?? []).map((doc) => (doc.id === updated.id ? updated : doc)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

/** Deletes a required onboarding document config. */
export function useDeleteDocumentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocumentConfig(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<OnboardingDocumentConfig[]>(
        queryKeys.onboarding.documentConfigs,
        (prev) => (prev ?? []).filter((doc) => doc.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
