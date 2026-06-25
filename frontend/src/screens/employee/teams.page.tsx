"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useMyTeams } from "@/modules/people/teams/hooks/use-my-teams";
import type { Team } from "@/modules/people/teams/types/teams.types";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import { Badge, Skeleton, UserAvatar } from "@/shared/ui";
import { EmptyState, ErrorState, FilterBar, SearchInput } from "@/shared/ui/patterns";
import { cn } from "@/shared/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className={cn("h-9 w-9", className)}
      fallbackClassName="text-[12px] font-bold text-white"
    />
  );
}

/** A team the signed-in employee belongs to. The whole card links to the team's detail page. */
function TeamCard({ team }: { team: Team }) {
  const stack = team.members.slice(0, 5);
  const extra = Math.max(0, team.memberCount - stack.length);

  return (
    <Link
      href={`/employee/teams/${team.id}`}
      className="group flex flex-col rounded-xl border border-[color:var(--border-primary)] bg-white p-5 transition-all hover:border-[color:var(--border-secondary)]"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-[16px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
          {team.name}
        </h3>
        <Badge variant="modern" size="sm" pill className="flex-none">
          {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <Avatar name={team.leader.fullName} src={team.leader.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {team.leader.fullName}
          </p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Team lead</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[color:var(--border-primary)] pt-4">
        <div className="flex -space-x-2">
          {stack.map((member) => (
            <Avatar
              key={member.id}
              name={member.fullName}
              src={member.avatarUrl}
              className="h-7 w-7 ring-2 ring-white"
            />
          ))}
          {extra > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--bg-tertiary)] text-[12px] font-semibold text-[color:var(--text-secondary)] ring-2 ring-white">
              +{extra}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--text-secondary)]">
          View
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/**
 * Employee "Teams" view: every team the signed-in employee belongs to, as a card grid showing the
 * leader and a member avatar stack. Selecting a card opens that team's detail page (leader + members,
 * with redacted profile access).
 */
export default function EmployeeTeamsPage() {
  const { appUser } = useAuth();
  const { teams, loading, error, reload } = useMyTeams(appUser?.employeeId || undefined);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Search matches the team name or its leader's name; results are sorted by team name.
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const list = query
      ? teams.filter(
          (team) =>
            team.name.toLowerCase().includes(query) ||
            team.leader.fullName.toLowerCase().includes(query),
        )
      : teams;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, debouncedSearch]);

  return (
    <div className="min-w-0">
      <ScreenHeader id="teams" level="page" />

      <FilterBar aria-label="Filter teams">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search by team or leader…"
          aria-label="Search teams"
          containerClassName="sm:max-w-[320px]"
        />
      </FilterBar>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[188px] rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <ErrorState message={error} onRetry={() => void reload()} />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <EmptyState
            icon={Users}
            title={debouncedSearch.trim() ? "No teams match" : "You're not on any teams yet"}
            body={
              debouncedSearch.trim()
                ? "Try a different team or leader name."
                : "Teams you're a member of will appear here."
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
