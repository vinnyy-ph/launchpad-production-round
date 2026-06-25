import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-keys";
import { addUser } from "../services/users.service";
import type { AddUserRequest } from "../types/users.types";

export function useAddUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: AddUserRequest) => addUser(body),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(response.message ?? "User created successfully.");
    },
    onError: (error: Error) => {
      // Field-level failures are shown inline in the invite dialog.
      if (error instanceof ApiError && error.fieldErrors.length > 0) return;
      toast.error(error.message || "Could not create user.");
    },
  });

  return {
    addUser: mutation.mutate,
    addUserAsync: mutation.mutateAsync,
    isAdding: mutation.isPending,
  };
}
