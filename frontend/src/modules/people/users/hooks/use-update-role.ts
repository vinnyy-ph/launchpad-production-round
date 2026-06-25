import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/lib/query-keys";
import { updateUserRole } from "../services/users.service";
import type { ChangeableRole } from "../types/users.types";

export function useUpdateRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ChangeableRole }) =>
      updateUserRole(userId, { role }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(response.message ?? "User role updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update user role.");
    },
  });

  return {
    updateRole: mutation.mutate,
    updateRoleAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
