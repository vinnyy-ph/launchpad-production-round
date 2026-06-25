import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/lib/query-keys";
import { activateUser } from "../services/users.service";

export function useActivateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(response.message ?? "User activated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not activate user.");
    },
  });

  return {
    activateUser: mutation.mutate,
    activateUserAsync: mutation.mutateAsync,
    isActivating: mutation.isPending,
  };
}
