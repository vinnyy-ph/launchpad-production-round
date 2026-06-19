"use client";

import { useMemo, useState } from "react";
import { Network, Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button, Input, Skeleton } from "@/shared/ui";
import {
  DataTable,
  EmptyState,
  FilterBar,
  PageTabs,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import { CreateTeamDialog } from "@/modules/people/teams/components/create-team-dialog";
import { TeamDetailsModal } from "@/modules/people/teams/components/team-details-modal";
import { TeamLeaderFilter } from "@/modules/people/teams/components/team-leader-filter";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type { Team } from "@/modules/people/teams/types/teams.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 7 }: { name: string; size?: 7 | 9 }) {
  const dim = size === 9 ? "h-9 w-9 text-[11px]" : "h-7 w-7 text-[10px]";
  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${dim}`}
      style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export default function TeamsPage() {
  const { appUser } = useAuth();
  const canManage = appUser?.role === "ADMIN" || appUser?.role === "HR";

  const { teams, loading, error, reload } = useTeams();
  const { employees } = useEmployees({ status: "active", limit: 100 });

  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("org-chart");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [search, setSearch] = useState("");
  const [leaderIds, setLeaderIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);

  const existingNames = useMemo(() => teams.map((team) => team.name), [teams]);
  // Read the selected team from the live list so the modal reflects member changes.
  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  // Distinct team leaders, for the leader filter dropdown.
  const leaderOptions = useMemo(() => {
    const byId = new Map<string, string>();
    teams.forEach((team) => byId.set(team.leader.id, team.leader.fullName));
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [teams]);

  // Filter by search (team or leader name) and selected leaders, then sort client-side
  // since the list endpoint returns teams unsorted and unfiltered.
  const visibleTeams = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    const filtered = teams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        team.leader.fullName.toLowerCase().includes(query);
      const matchesLeader = leaderIds.size === 0 || leaderIds.has(team.leader.id);
      return matchesSearch && matchesLeader;
    });

    const direction = sort.direction === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
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
  }, [teams, debouncedSearch, leaderIds, sort]);

  const hasFilters = Boolean(search) || leaderIds.size > 0;

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
      header: "Team leaders",
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
      className: "min-w-[200px] text-center",
      sortable: true,
      sortKey: "members",
      cell: (team) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{team.memberCount}</span>
      ),
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        level="page"
        title="Structure"
        subtitle="Organizational structure and team membership."
        action={
          activeTab === "teams" && canManage && !loading && !error && teams.length > 0 ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Create team
            </Button>
          ) : undefined
        }
      />

      <PageTabs
        ariaLabel="Organization views"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: "org-chart", label: "Org Chart" },
          { value: "teams", label: "Teams" },
        ]}
      />

      {activeTab === "org-chart" ? (
        <OrgChartPanel
          teams={teams}
          loading={loading}
          error={error}
          canManage={canManage}
          onCreateTeam={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <FilterBar aria-label="Filter teams">
            <Input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by team or leader…"
              aria-label="Search teams"
              className="sm:max-w-[320px]"
            />
            <TeamLeaderFilter
              leaders={leaderOptions}
              selected={leaderIds}
              onChange={setLeaderIds}
            />
          </FilterBar>

          <div
            className="rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <DataTable
              columns={columns}
              data={visibleTeams}
              isLoading={loading}
              error={error}
              onRetry={() => void reload()}
              onRowClick={(team) => setSelectedTeamId(team.id)}
              getRowId={(team) => team.id}
              sort={sort}
              onSortChange={setSort}
              mobileLayout="scroll"
              emptyState={
                <EmptyState
                  icon={Network}
                  title={hasFilters ? "No teams match" : "No teams configured"}
                  body={
                    hasFilters
                      ? "Try a different search or leader filter."
                      : canManage
                        ? "Create your first team to start building the org structure."
                        : "Teams will appear here once HR sets up the org structure."
                  }
                  action={
                    !hasFilters && canManage
                      ? { label: "Create team", onClick: () => setCreateOpen(true) }
                      : undefined
                  }
                />
              }
            />
          </div>
        </>
      )}

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        existingNames={existingNames}
        onCreated={() => void reload()}
      />

      <TeamDetailsModal
        team={selectedTeam}
        open={selectedTeamId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTeamId(null);
        }}
        canManage={canManage}
        employees={employees}
      />
    </div>
  );
}

interface OrgChartPanelProps {
  teams: Team[];
  loading: boolean;
  error: string | null;
  canManage: boolean;
  onCreateTeam: () => void;
}

function OrgChartPanel({ teams, loading, error, canManage, onCreateTeam }: OrgChartPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (error) return null;

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="No org chart yet"
        body={
          canManage
            ? "Create teams to map leaders, members, and reporting groups."
            : "The org chart will appear once HR sets up the structure."
        }
        action={canManage ? { label: "Create team", onClick: onCreateTeam } : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const members = team.members.filter((member) => member.id !== team.leader.id);

        return (
          <div
            key={team.id}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="min-w-0 md:w-64 md:flex-shrink-0">
                <p className="truncate text-sm font-bold text-[color:var(--text-primary)]">
                  {team.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                  {team.memberCount} members
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                    Team lead
                  </p>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <Avatar name={team.leader.fullName} size={9} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                        {team.leader.fullName}
                      </span>
                      <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                        {team.leader.jobTitle ?? team.leader.companyEmail}
                      </span>
                    </span>
                  </div>
                </div>

                {members.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex min-w-0 items-center gap-2 rounded-lg border border-[color:var(--border-primary)] bg-white p-2"
                      >
                        <Avatar name={member.fullName} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">
                            {member.fullName}
                          </span>
                          <span className="block truncate text-xs text-[color:var(--text-tertiary)]">
                            {member.jobTitle ?? member.companyEmail}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
                    No additional members yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
