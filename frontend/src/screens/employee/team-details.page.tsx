"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useMyTeams } from "@/modules/people/teams/hooks/use-my-teams";
import { TeamDetailsView } from "@/modules/people/teams/components/team-details-view";

/**
 * Team detail view for an employee: shows the team name, its leader, and all members, each
 * clickable to open their redacted profile. Scoped to the viewer's own teams — a team they don't
 * belong to resolves to a "not found" state. If the viewer leads this team, they may add and
 * remove members (their only extra ability); renaming stays an HR/Admin action.
 */
export default function EmployeeTeamDetailsPage() {
  const params = useParams();
  const { appUser } = useAuth();
  const teamId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const { teams, loading, error, reload } = useMyTeams(appUser?.employeeId || undefined);
  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);

  const isLead = Boolean(appUser?.employeeId && team?.leader.id === appUser.employeeId);

  return (
    <TeamDetailsView
      team={team}
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      canRename={false}
      canManageMembers={isLead}
      backHref="/employee/teams"
      backLabel="Teams"
    />
  );
}
