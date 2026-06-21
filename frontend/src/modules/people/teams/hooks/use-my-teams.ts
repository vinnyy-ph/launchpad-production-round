import { useMemo } from "react";
import { useTeams } from "./use-teams";
import type { Team } from "../types/teams.types";

/**
 * Teams the given employee belongs to — as the leader or a member.
 *
 * The teams list endpoint returns the whole org-wide team directory (no per-member filter),
 * so membership is resolved here on the client. Returns an empty list until the employee id
 * is known.
 */
export function useMyTeams(employeeId: string | undefined) {
  const { teams, loading, error, reload } = useTeams({ page: 1, limit: 100 });

  const myTeams = useMemo<Team[]>(() => {
    if (!employeeId) return [];
    return teams.filter(
      (team) =>
        team.leader.id === employeeId || team.members.some((member) => member.id === employeeId),
    );
  }, [teams, employeeId]);

  return { teams: myTeams, loading, error, reload };
}
