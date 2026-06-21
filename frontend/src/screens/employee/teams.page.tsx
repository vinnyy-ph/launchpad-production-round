"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useMyTeams } from "@/modules/people/teams/hooks/use-my-teams";
import type { Team } from "@/modules/people/teams/types/teams.types";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import { Input } from "@/shared/ui";
import {
  DataTable,
  EmptyState,
  FilterBar,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";

const PAGE_SIZE = 10;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/**
 * Employee "Teams" view: lists every team the signed-in employee belongs to. Selecting a row
 * opens that team's detail page (leader + members, with redacted profile access).
 */
export default function EmployeeTeamsPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { teams, loading, error, reload } = useMyTeams(appUser?.employeeId || undefined);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Search matches the team name or its leader's name; sort is applied afterward.
  const sortedTeams = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = query
      ? teams.filter(
          (team) =>
            team.name.toLowerCase().includes(query) ||
            team.leader.fullName.toLowerCase().includes(query),
        )
      : teams;

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "leader":
          return a.leader.fullName.localeCompare(b.leader.fullName) * direction;
        case "members":
          return (a.memberCount - b.memberCount) * direction;
        case "name":
        default:
          return a.name.localeCompare(b.name) * direction;
      }
    });
  }, [teams, debouncedSearch, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / PAGE_SIZE));
  const pageItems = sortedTeams.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to the first page whenever the search narrows the result set underneath us.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const columns: Column<Team>[] = [
    {
      header: "Team name",
      className: "min-w-[150px]",
      sortable: true,
      sortKey: "name",
      cell: (team) => (
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{team.name}</p>
      ),
    },
    {
      header: "Team leader",
      className: "min-w-[200px] text-center",
      sortable: true,
      sortKey: "leader",
      cell: (team) => (
        <div className="flex items-center justify-center gap-2">
          <Avatar name={team.leader.fullName} />
          <span className="truncate text-sm text-[color:var(--text-secondary)]">
            {team.leader.fullName}
          </span>
        </div>
      ),
    },
    {
      header: "Members",
      className: "min-w-[120px] text-center",
      sortable: true,
      sortKey: "members",
      cell: (team) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{team.memberCount}</span>
      ),
    },
  ];

  return (
    <div className="min-w-0">
      <ScreenHeader id="teams" level="page" />

      <FilterBar aria-label="Filter teams">
        <Input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by team or leader…"
          aria-label="Search teams"
          className="sm:max-w-[320px]"
        />
      </FilterBar>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={loading}
          error={error}
          onRetry={() => void reload()}
          onRowClick={(team) => router.push(`/employee/teams/${team.id}`)}
          getRowId={(team) => team.id}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, totalPages, onPageChange: setPage }}
          mobileLayout="scroll"
          emptyState={
            <EmptyState
              icon={Users}
              title={debouncedSearch.trim() ? "No teams match" : "You're not on any teams yet"}
              body={
                debouncedSearch.trim()
                  ? "Try a different team or leader name."
                  : "Teams you're a member of will appear here."
              }
            />
          }
        />
      </div>
    </div>
  );
}
