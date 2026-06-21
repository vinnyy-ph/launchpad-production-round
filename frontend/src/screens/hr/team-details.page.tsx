"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import { TeamDetailsView } from "@/modules/people/teams/components/team-details-view";

/**
 * HR/Admin team detail view: opened from the Structure → Teams table. Shows the team's leader and
 * members (each clickable to open their profile) and lets HR/Admin rename the team and add or
 * remove members. Reads the team from the org-wide teams list.
 */
export default function HrTeamDetailsPage() {
  const params = useParams();
  const { appUser } = useAuth();
  const canManage = appUser?.role === "ADMIN" || appUser?.role === "HR";
  const teamId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const { teams, loading, error, reload } = useTeams();
  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);

  return (
    <TeamDetailsView
      team={team}
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      canRename={canManage}
      canManageMembers={canManage}
      backHref="/hr/teams?tab=teams"
      backLabel="Structure"
    />
  );
}
