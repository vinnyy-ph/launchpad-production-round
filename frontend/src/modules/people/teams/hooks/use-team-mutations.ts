import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  addTeamMembers,
  removeTeamMember,
  updateTeamName,
} from "../services/teams.service";

/**
 * Team management mutations: rename, add members, remove a member. Renaming is an HR/Admin action;
 * adding and removing members is allowed for HR/Admin and the team's own leader (enforced by the
 * API). Each invalidates the teams list so every team view refreshes after a write.
 */
export function useTeamMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });

  const rename = useMutation({
    mutationFn: ({ teamId, name }: { teamId: string; name: string }) =>
      updateTeamName(teamId, name),
    onSuccess: invalidate,
  });

  const addMembers = useMutation({
    mutationFn: ({ teamId, memberIds }: { teamId: string; memberIds: string[] }) =>
      addTeamMembers(teamId, memberIds),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: ({ teamId, employeeId }: { teamId: string; employeeId: string }) =>
      removeTeamMember(teamId, employeeId),
    onSuccess: invalidate,
  });

  return {
    rename: rename.mutateAsync,
    renaming: rename.isPending,
    addMembers: addMembers.mutateAsync,
    addingMembers: addMembers.isPending,
    removeMember: removeMember.mutateAsync,
    removingMember: removeMember.isPending,
  };
}
