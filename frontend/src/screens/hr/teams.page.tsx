"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Network, Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button, Input, Skeleton } from "@/shared/ui";
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  MultiSelectFilter,
  PageTabs,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import { CreateTeamDialog } from "@/modules/people/teams/components/create-team-dialog";
import { TeamDetailsModal } from "@/modules/people/teams/components/team-details-modal";
import {
  buildDepartmentOrgChart,
  type OrgChartItem,
} from "@/modules/people/employees/components/org-chart/org-chart";
import { OrgChartTree } from "@/modules/people/employees/components/org-chart/org-chart-tree";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type { Team } from "@/modules/people/teams/types/teams.types";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

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
  // Whole-organization list (all statuses) for the supervisor-hierarchy org chart.
  const {
    employees: orgEmployees,
    loading: orgLoading,
    error: orgError,
    reload: orgReload,
  } = useEmployees({ limit: 100 });

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
          employees={orgEmployees}
          loading={orgLoading}
          error={orgError}
          onRetry={() => void orgReload()}
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
            <MultiSelectFilter
              options={leaderOptions}
              selected={leaderIds}
              onChange={setLeaderIds}
              allLabel="All team leaders"
              countNoun="leaders"
              searchPlaceholder="Search leaders…"
              emptyText="No leaders found."
              ariaLabel="Filter by team leader"
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
  /** Whole-organization employee list (all statuses) used to build the supervisor tree. */
  employees: EmployeeListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/**
 * Org Chart tab: the organization's supervisor hierarchy (CEO at the root) as a
 * collapsible top-down tree. Defaults to fully expanded so the whole chart is visible.
 */
function OrgChartPanel({ employees, loading, error, onRetry }: OrgChartPanelProps) {
  const { departments, loading: departmentsLoading } = useDepartments();

  // CEO at the top → every department beneath → each department's in-supervisor hierarchy.
  const roots = useMemo(
    () =>
      buildDepartmentOrgChart(
        employees,
        departments.map((department) => department.name),
      ),
    [employees, departments],
  );

  // Ids of nodes that actually have children — the only ones that can be toggled / expanded.
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: OrgChartItem[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.add(node.id);
          walk(node.children);
        }
      }
    };
    walk(roots);
    return ids;
  }, [roots]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initialized = useRef(false);

  // Initial view: expand only the org root (CEO) so the departments show, but keep the
  // departments themselves collapsed (employees hidden) until the user drills in. Wait for
  // both queries to settle so `roots` already holds the CEO with its department children —
  // otherwise an early-resolving departments query could latch the default before the CEO exists.
  useEffect(() => {
    if (initialized.current || loading || departmentsLoading || roots.length === 0) return;
    setExpanded(new Set(roots.filter((node) => node.kind === "person").map((node) => node.id)));
    initialized.current = true;
  }, [roots, loading, departmentsLoading]);

  function toggle(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  if (loading || departmentsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="mx-auto h-28 w-52 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (roots.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="No org chart yet"
        body="Add employees and assign supervisors to see the reporting structure."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(parentIds))}>
          <ChevronsUpDown aria-hidden="true" />
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())}>
          <ChevronsDownUp aria-hidden="true" />
          Collapse all
        </Button>
      </div>

      <div
        className="overflow-x-auto rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="mx-auto w-max">
          <OrgChartTree nodes={roots} expanded={expanded} onToggle={toggle} />
        </div>
      </div>
    </div>
  );
}
