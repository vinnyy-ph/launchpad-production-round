import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  createClearanceTemplate,
  deleteClearanceTemplate,
  getClearanceTemplateOptions,
  getClearanceTemplates,
  setDefaultClearanceTemplate,
  updateClearanceTemplate,
} from "../services/offboarding.service";
import type {
  CreateClearanceTemplateInput,
  UpdateClearanceTemplateInput,
} from "../types/offboarding.types";

/**
 * Lightweight clearance version options (id, name, isDefault, signatoryCount) for the
 * offboarding initiate picker. Hits GET /clearance/templates.
 */
export function useClearanceTemplateOptions(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.clearance.templateOptions,
    queryFn: () => getClearanceTemplateOptions(),
    enabled,
  });

  return {
    templates: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/**
 * Full HR-managed clearance versions (with signatories + in-use count) for the management
 * page. Hits GET /clearance-templates.
 */
export function useClearanceTemplates(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.clearance.templates,
    queryFn: () => getClearanceTemplates(),
    enabled,
  });

  return {
    templates: data ?? [],
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    reload: refetch,
  };
}

/**
 * Mutations for clearance versions. Every mutation invalidates the version list so the
 * management page and the offboarding initiate picker (which reads available versions and
 * the current default) stay in sync.
 */
export function useClearanceTemplateMutations() {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.templates });
  }

  const create = useMutation({
    mutationFn: (input: CreateClearanceTemplateInput) => createClearanceTemplate(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; input: UpdateClearanceTemplateInput }) =>
      updateClearanceTemplate(vars.id, vars.input),
    onSuccess: invalidate,
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => setDefaultClearanceTemplate(id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteClearanceTemplate(id),
    onSuccess: invalidate,
  });

  return { create, update, setDefault, remove };
}
