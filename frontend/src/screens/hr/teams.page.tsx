"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Network, Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button, Input, Skeleton, UserAvatar } from "@/shared/ui";
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
import {
  buildDepartmentOrgChart,
  type OrgChartItem,
} from "@/modules/people/employees/components/org-chart/org-chart";
import { OrgChartTree } from "@/modules/people/employees/components/org-chart/org-chart-tree";
import { OrgChartCanvas } from "@/modules/people/employees/components/org-chart/org-chart-canvas";
import { EmployeeProfileSheet } from "@/modules/people/employees/components/employee-profile-sheet";
import { useAllEmployees, useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type { Team } from "@/modules/people/teams/types/teams.types";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, src, size = 7 }: { name: string; src?: string | null; size?: 7 | 9 }) {
  const dim = size === 9 ? "h-9 w-9" : "h-7 w-7";
  const textSize = size === 9 ? "text-[11px]" : "text-[10px]";
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className={`flex-shrink-0 ${dim}`}
      fallbackClassName={`${textSize} font-bold text-white`}
      fallbackStyle={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
    />
  );
}

export default function TeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appUser } = useAuth();
  const canManage = appUser?.role === "ADMIN" || appUser?.role === "HR";

  const { teams, loading, error, reload } = useTeams();
  const { employees } = useEmployees({ status: "active", limit: 100 });
  // Whole-organization list (all statuses, non-paginated) for the supervisor-hierarchy org chart.
  const {
    employees: orgEmployees,
    loading: orgLoading,
    error: orgError,
    reload: orgReload,
  } = useAllEmployees();

  const [createOpen, setCreateOpen] = useState(false);
  // Open on the Teams tab when navigated back to with ?tab=teams (e.g. from a team detail page).
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "teams" ? "teams" : "org-chart",
  );
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [search, setSearch] = useState("");
  const [leaderIds, setLeaderIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);

  const existingNames = useMemo(() => teams.map((team) => team.name), [teams]);

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
          <Avatar name={team.leader.fullName} src={team.leader.avatarUrl} />
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
              onRowClick={(team) => router.push(`/hr/teams/${team.id}`)}
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

  // Org-chart filters. Both are applied client-side because the chart is a hierarchy built from
  // the already-loaded employee list — filtering server-side would drop intermediate supervisors
  // and break the tree.
  const [search, setSearch] = useState("");
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 200);
  const isFiltering = debouncedSearch.trim().length > 0 || departmentIds.size > 0;

  // The chart keys departments by name; map the selected ids to names for employee matching.
  const selectedDepartmentNames = useMemo(
    () => new Set(departments.filter((d) => departmentIds.has(d.id)).map((d) => d.name)),
    [departments, departmentIds],
  );

  // Whether an employee satisfies the active name + department filters.
  const passesFilters = useCallback(
    (employee: EmployeeListItem) => {
      const query = debouncedSearch.trim().toLowerCase();
      if (query && !employee.fullName.toLowerCase().includes(query)) return false;
      if (
        departmentIds.size > 0 &&
        !(employee.department && selectedDepartmentNames.has(employee.department))
      ) {
        return false;
      }
      return true;
    },
    [debouncedSearch, departmentIds, selectedDepartmentNames],
  );

  // Direct-reports adjacency (supervisor id → their reports), used to pull a matched person's
  // whole downward subtree into the results.
  const reportsBySupervisor = useMemo(() => {
    const map = new Map<string, EmployeeListItem[]>();
    for (const employee of employees) {
      const supervisorId = employee.supervisor?.id;
      if (!supervisorId) continue;
      const reports = map.get(supervisorId) ?? [];
      reports.push(employee);
      map.set(supervisorId, reports);
    }
    return map;
  }, [employees]);

  // Employees fed into the chart: everyone matching the filters PLUS everyone reporting (directly
  // or indirectly) to a match — so searching a manager also surfaces the people under them. The
  // org root (CEO) is always kept as the structural anchor even when it doesn't match itself.
  const filteredEmployees = useMemo(() => {
    const included = new Set(employees.filter(passesFilters).map((employee) => employee.id));

    // Walk down from each match, collecting their reports transitively.
    const queue = [...included];
    while (queue.length > 0) {
      const supervisorId = queue.shift() as string;
      for (const report of reportsBySupervisor.get(supervisorId) ?? []) {
        if (!included.has(report.id)) {
          included.add(report.id);
          queue.push(report.id);
        }
      }
    }

    return employees.filter(
      (employee) => employee.supervisor === null || included.has(employee.id),
    );
  }, [employees, passesFilters, reportsBySupervisor]);

  // How many people actually match (the root is excluded unless it genuinely matches) — drives
  // the "no matches" empty state so a kept-anchor CEO doesn't mask an empty result.
  const matchCount = useMemo(
    () => employees.filter(passesFilters).length,
    [employees, passesFilters],
  );

  // Which department nodes to render: the selected ones, or all when no department filter is set.
  const visibleDepartmentNames = useMemo(
    () =>
      departmentIds.size > 0
        ? departments.filter((d) => departmentIds.has(d.id)).map((d) => d.name)
        : departments.map((d) => d.name),
    [departments, departmentIds],
  );

  // CEO at the top → matching departments beneath → each department's in-supervisor hierarchy.
  const roots = useMemo(
    () => buildDepartmentOrgChart(filteredEmployees, visibleDepartmentNames),
    [filteredEmployees, visibleDepartmentNames],
  );

  // Employees whose name matches the current search — their cards get a gradient-pink outline.
  // Empty when not searching, so nothing is highlighted by default.
  const matchedIds = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return new Set<string>();
    return new Set(
      employees.filter((e) => e.fullName.toLowerCase().includes(query)).map((e) => e.id),
    );
  }, [employees, debouncedSearch]);

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

  // "Departments visible, everything below collapsed" — the initial view and the Collapse all
  // target. Expanding only the top-level person (CEO) reveals the department nodes while keeping
  // them closed.
  const departmentsOnlyExpanded = useMemo(
    () => new Set(roots.filter((node) => node.kind === "person").map((node) => node.id)),
    [roots],
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const initialized = useRef(false);

  // Employee whose detail drawer is open (clicked from a person card). Null = closed.
  const [selected, setSelected] = useState<EmployeeListItem | null>(null);
  // The canvas container element + whether it's full screen. In full screen the drawer must portal
  // INTO this element, since a body-level portal would fall outside the fullscreen top layer.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Bumped by expand-all / collapse-all so the canvas re-centers on those (but not on single-node
  // toggles). Combined with the active filters into `recenterKey` below.
  const [recenterEpoch, setRecenterEpoch] = useState(0);

  // Initial view: expand only the org root (CEO) so the departments show, but keep the
  // departments themselves collapsed (employees hidden) until the user drills in. Wait for
  // both queries to settle so `roots` already holds the CEO with its department children —
  // otherwise an early-resolving departments query could latch the default before the CEO exists.
  useEffect(() => {
    if (initialized.current || loading || departmentsLoading || roots.length === 0) return;
    setExpanded(new Set(departmentsOnlyExpanded));
    initialized.current = true;
  }, [departmentsOnlyExpanded, loading, departmentsLoading, roots.length]);

  function toggle(employeeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  // While filtering, reveal every match by expanding all parents; otherwise honor the user's
  // manual expand/collapse state (which defaults to just the CEO).
  const effectiveExpanded = isFiltering ? parentIds : expanded;

  // Re-frame the chart whenever its layout shifts under the user: a new search, a department
  // filter change, or expand/collapse all (tracked via `recenterEpoch`). Single-node toggles are
  // intentionally excluded so drilling into one branch doesn't yank the whole view.
  const recenterKey = `${debouncedSearch}|${[...departmentIds].sort().join(",")}|${recenterEpoch}`;

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
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name…"
          aria-label="Search org chart by name"
          className="sm:max-w-[260px]"
        />
        <MultiSelectFilter
          options={departments.map((department) => ({ id: department.id, name: department.name }))}
          selected={departmentIds}
          onChange={setDepartmentIds}
          allLabel="All departments"
          countNoun="departments"
          searchPlaceholder="Search departments…"
          emptyText="No departments found."
          ariaLabel="Filter org chart by department"
        />
      </div>

      {isFiltering && matchCount === 0 ? (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <EmptyState
            icon={Workflow}
            title="No one matches that"
            body="Try a different name or department."
          />
        </div>
      ) : (
        <OrgChartCanvas
          containerRef={canvasRef}
          onFullscreenChange={setIsFullscreen}
          recenterKey={recenterKey}
          onExpandAll={() => {
            setExpanded(new Set(parentIds));
            setRecenterEpoch((epoch) => epoch + 1);
          }}
          onCollapseAll={() => {
            setExpanded(new Set(departmentsOnlyExpanded));
            setRecenterEpoch((epoch) => epoch + 1);
          }}
        >
          <OrgChartTree
            nodes={roots}
            expanded={effectiveExpanded}
            onToggle={toggle}
            matchedIds={matchedIds}
            onOpenProfile={(id) => {
              const employee = employees.find((candidate) => candidate.id === id);
              if (employee) setSelected(employee);
            }}
          />
        </OrgChartCanvas>
      )}

      <EmployeeProfileSheet
        employeeId={selected?.id ?? null}
        fallbackEmployee={selected}
        onClose={() => setSelected(null)}
        // While full screen, portal the drawer into the canvas so it stays in the top layer.
        container={isFullscreen ? canvasRef.current : null}
      />
    </div>
  );
}
