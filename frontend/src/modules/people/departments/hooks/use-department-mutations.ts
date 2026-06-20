import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "../services/departments.service";
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "../types/departments.types";

/**
 * Department write operations (HR/Admin only): create, rename, soft-delete.
 * Each invalidates every department query so the table and edit dropdowns refresh.
 */
export function useDepartmentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });

  const create = useMutation({
    mutationFn: (input: CreateDepartmentInput) => createDepartment(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentInput }) =>
      updateDepartment(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: invalidate,
  });

  return {
    create: create.mutateAsync,
    creating: create.isPending,
    update: update.mutateAsync,
    updating: update.isPending,
    remove: remove.mutateAsync,
    removing: remove.isPending,
  };
}
