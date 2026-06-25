import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { createTeam } from "../services/teams.service";
import type { CreateTeamInput } from "../types/teams.types";

/**
 * Creates a team (POST /api/v1/teams, HR/Admin only).
 * On success, invalidates the teams list so the directory refreshes.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateTeamInput) => createTeam(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
    },
  });

  return {
    create: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
