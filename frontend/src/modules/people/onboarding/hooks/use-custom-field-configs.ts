import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  createCustomFieldConfig,
  deleteCustomFieldConfig,
  getCustomFieldConfigs,
  updateCustomFieldConfig,
} from "../services/onboarding.service";
import type {
  CreateCustomFieldConfigInput,
  OnboardingCustomFieldConfig,
  UpdateCustomFieldConfigInput,
} from "../types/onboarding.types";

/** Org-wide onboarding custom fields configured by HR. */
export function useCustomFieldConfigs() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.onboarding.customFieldConfigs,
    queryFn: () => getCustomFieldConfigs(),
  });

  return {
    fields: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/** Creates a custom onboarding field config. */
export function useCreateCustomFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomFieldConfigInput) => createCustomFieldConfig(input),
    onSuccess: (created) => {
      queryClient.setQueryData<OnboardingCustomFieldConfig[]>(
        queryKeys.onboarding.customFieldConfigs,
        (prev) => [...(prev ?? []), created],
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

/** Updates a custom onboarding field config. */
export function useUpdateCustomFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: UpdateCustomFieldConfigInput }) =>
      updateCustomFieldConfig(vars.id, vars.input),
    onSuccess: (updated) => {
      queryClient.setQueryData<OnboardingCustomFieldConfig[]>(
        queryKeys.onboarding.customFieldConfigs,
        (prev) => (prev ?? []).map((field) => (field.id === updated.id ? updated : field)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}

/** Deletes a custom onboarding field config. */
export function useDeleteCustomFieldConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCustomFieldConfig(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<OnboardingCustomFieldConfig[]>(
        queryKeys.onboarding.customFieldConfigs,
        (prev) => (prev ?? []).filter((field) => field.id !== id),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
