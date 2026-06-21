"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useMyTeams } from "@/modules/people/teams/hooks/use-my-teams";
import type { TeamEmployee } from "@/modules/people/teams/types/teams.types";
import { RedactedProfileSheet } from "@/modules/people/employees/components/redacted-profile-sheet";
import { Button, Skeleton } from "@/shared/ui";
import { EmptyState, ErrorState } from "@/shared/ui/patterns";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** A clickable person row that opens the redacted profile drawer. */
function PersonRow({
  person,
  caption,
  onOpen,
}: {
  person: TeamEmployee;
  caption?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${person.fullName}'s profile`}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[color:var(--bg-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Avatar name={person.fullName} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
          {person.fullName}
        </span>
        <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
          {caption ?? person.jobTitle ?? person.companyEmail}
        </span>
      </span>
    </button>
  );
}

/**
 * Team detail view for an employee: shows the team name, its leader, and all members. Selecting
 * any person opens their redacted profile. Scoped to the viewer's own teams — a team they don't
 * belong to resolves to a "not found" state.
 */
export default function EmployeeTeamDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { appUser } = useAuth();
  const teamId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const { teams, loading, error, reload } = useMyTeams(appUser?.employeeId || undefined);
  const team = useMemo(() => teams.find((t) => t.id === teamId) ?? null, [teams, teamId]);

  const [profileId, setProfileId] = useState<string | null>(null);

  // The leader is always part of the team; the members section lists everyone else.
  const otherMembers = useMemo(
    () => (team ? team.members.filter((member) => member.id !== team.leader.id) : []),
    [team],
  );

  const backButton = (
    <Button variant="outline" size="sm" onClick={() => router.push("/employee/teams")}>
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Teams
    </Button>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {backButton}
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {backButton}
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-4">
        {backButton}
        <EmptyState
          icon={Users}
          title="Team not found"
          body="This team doesn't exist or you're not a member of it."
          action={{ label: "Back to teams", onClick: () => router.push("/employee/teams") }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-[color:var(--text-primary)]">{team.name}</h1>
          <p className="text-sm text-[color:var(--text-tertiary)]">
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
        {backButton}
      </div>

      {/* Team lead */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team leader
        </p>
        <PersonRow
          person={team.leader}
          caption={team.leader.jobTitle ?? team.leader.companyEmail}
          onOpen={() => setProfileId(team.leader.id)}
        />
      </div>

      {/* Members (excludes the leader, shown above) */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Members ({otherMembers.length})
        </p>
        {otherMembers.length === 0 ? (
          <p className="px-2 py-2 text-xs text-[color:var(--text-tertiary)]">
            No additional members yet.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border-primary)]">
            {otherMembers.map((member) => (
              <li key={member.id}>
                <PersonRow person={member} onOpen={() => setProfileId(member.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <RedactedProfileSheet
        employeeId={profileId}
        open={Boolean(profileId)}
        onOpenChange={(open) => {
          if (!open) setProfileId(null);
        }}
      />
    </div>
  );
}
