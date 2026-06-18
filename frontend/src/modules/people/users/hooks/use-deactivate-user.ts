import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/lib/query-keys";
import { deactivateUser } from "../services/users.service";

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(response.message ?? "User deactivated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not deactivate user.");
    },
  });

  return {
    deactivateUser: mutation.mutate,
    deactivateUserAsync: mutation.mutateAsync,
    isDeactivating: mutation.isPending,
  };
}
