"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Users, Filter, ArrowUpDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import type {
  EmployeeListItem,
  EmployeeStatus,
} from "@/modules/people/employees/types/employees.types";
import {
  buildReportingChart,
  allReportingIds,
  type OrgChartItem,
} from "@/modules/people/employees/components/org-chart/org-chart";
import { OrgChartTree } from "@/modules/people/employees/components/org-chart/org-chart-tree";
import { EmployeeProfileSheet } from "@/modules/people/employees/components/employee-profile-sheet";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import {
  DataTable,
  type Column,
  type DataTableSort,
  EmptyState,
  ErrorState,
  PageTabs,
  StatusBadge,
  FilterBar,
  SearchInput,
} from "@/shared/ui/patterns";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  UserAvatar,
} from "@/shared/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

const PAGE_SIZE = 10;
const STATUS_OPTIONS: { value: EmployeeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "offboarding", label: "Offboarding" },
  { value: "inactive", label: "Inactive" },
];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "role", label: "Role / Department" },
  { value: "status", label: "Status" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || undefined;

  // Supervisors are EMPLOYEE-role callers, so the API returns the REDACTED list (no PII).
  // The server-side `reportingToId` filter scopes it to this supervisor's whole downward
  // hierarchy: direct reports AND everyone below them.
  const { employees, loading, error, reload } = useEmployees({
    reportingToId: employeeId,
    page: 1,
    limit: 100,
  });
  const reports = useMemo(() => (employeeId ? employees : []), [employeeId, employees]);

  const [activeTab, setActiveTab] = useState("list");
  const [selected, setSelected] = useState<EmployeeListItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "ALL">("ALL");
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);

  // The logged-in supervisor sits at the top of their own chart. Their card is assembled from
  // the auth session plus the supervisor reference carried on any direct report (for name/title),
  // avoiding an extra request for the viewer's own record.
  const selfEmployee = useMemo<EmployeeListItem | null>(() => {
    if (!employeeId) return null;
    const ref = reports.find((r) => r.supervisor?.id === employeeId)?.supervisor ?? null;
    return {
      id: employeeId,
      userId: appUser?.userId ?? "",
      firstName: ref?.firstName ?? "",
      middleName: null,
      lastName: ref?.lastName ?? "",
      fullName: ref?.fullName || appUser?.displayName || appUser?.email || "You",
      // This card is the signed-in supervisor, so their own Google photo applies.
      avatarUrl: appUser?.avatarUrl ?? null,
      companyEmail: ref?.companyEmail ?? appUser?.email ?? "",
      jobTitle: ref?.jobTitle ?? null,
      department: null,
      address: null,
      emergencyContact: null,
      teams: [],
      supervisor: null,
      status: (appUser?.employeeStatus?.toLowerCase() as EmployeeStatus) ?? "active",
    };
  }, [employeeId, reports, appUser]);

  // Top-down org chart rooted at the supervisor, with their direct reports and everyone below
  // nested beneath them.
  const orgChartNodes = useMemo<OrgChartItem[]>(() => {
    const reportNodes = buildReportingChart(reports);
    if (!selfEmployee) return reportNodes;
    return [{ kind: "person", id: selfEmployee.id, employee: selfEmployee, children: reportNodes }];
  }, [reports, selfEmployee]);

  // Org chart expand/collapse state — defaults to fully expanded once the reports load so the
  // whole hierarchy is visible. The supervisor's own node is included so it starts open.
  const orgChartIds = useMemo(
    () => (employeeId ? [employeeId, ...allReportingIds(reports)] : allReportingIds(reports)),
    [employeeId, reports],
  );
  const [orgExpanded, setOrgExpanded] = useState<Set<string>>(new Set());
  const orgInitialized = useRef(false);
  useEffect(() => {
    if (!orgInitialized.current && orgChartIds.length > 0) {
      setOrgExpanded(new Set(orgChartIds));
      orgInitialized.current = true;
    }
  }, [orgChartIds]);

  function toggleOrgNode(id: string) {
    setOrgExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Status filter + search, then sort — all client-side over the direct-report list.
  const filtered = useMemo(() => {
    let list = reports;
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.fullName.toLowerCase().includes(q) || r.companyEmail.toLowerCase().includes(q),
      );
    }
    return list;
  }, [reports, statusFilter, search]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "role":
          return dir * (a.jobTitle ?? "").localeCompare(b.jobTitle ?? "");
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "name":
        default:
          return dir * a.fullName.localeCompare(b.fullName);
      }
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(search || statusFilter !== "ALL");

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const columns: Column<EmployeeListItem>[] = [
      {
          header: "Name",
          sortable: true,
          className: "max-w-[200px] text-start",
          sortKey: "name",
          cell: (row) => (
              <div className="flex items-center gap-3">
                  <UserAvatar
                      src={row.avatarUrl}
                      fallback={initials(row.fullName)}
                      className="h-8 w-8"
                      fallbackClassName="text-xs font-bold text-white"
                      fallbackStyle={{
                          background:
                              "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                      }}
                  />
                  <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                          {row.fullName}
                      </p>
                      <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                          {row.companyEmail}
                      </p>
                  </div>
              </div>
          ),
      },
      {
          header: "Job Title / Department",
          sortable: true,
          className: "max-w-[200px] text-start",
          sortKey: "role",
          cell: (row) => (
              <div className="min-w-0">
                  <p className="truncate text-sm text-[color:var(--text-primary)]">
                      {row.jobTitle ?? "—"}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                      {row.department ?? "—"}
                  </p>
              </div>
          ),
      },
      {
          header: "Team/s",
          className: "min-w-[150px] text-center",
          cell: (row) => (
              <span className="text-sm text-[color:var(--text-secondary)]">
                  {row.teams.length
                      ? row.teams.map((t) => t.name).join(", ")
                      : "No teams assigned"}
              </span>
          ),
      },
      {
          header: "Status",
          mobileLabel: "Status",
          className: "min-w-[100px] text-center",
          sortable: true,
          sortKey: "status",
          cell: (row) => <StatusBadge status={row.status} dot />,
      },
  ];

  return (
    <div className="min-w-0">
      <ScreenHeader id="roster" level="page" />

      <PageTabs
        ariaLabel="Roster views"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: "list", label: "List" },
          { value: "org-chart", label: "Org Chart" },
        ]}
      />

      {activeTab === "list" ? (
        <>
          <FilterBar aria-label="Filter roster" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search by name or email…"
            aria-label="Search roster"
            containerClassName="sm:max-w-[320px]"
          />
          <div className="flex w-full gap-2 md:hidden">
            <Select
              value={sort.key}
              onValueChange={(v: string) => setSort((s) => ({ key: v, direction: s.direction }))}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() =>
                setSort((s) => ({
                  key: s.key,
                  direction: s.direction === "asc" ? "desc" : "asc",
                }))
              }
              aria-label={`Sort ${sort.direction === "asc" ? "descending" : "ascending"}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v: string) => setStatusFilter(v as EmployeeStatus | "ALL")}
          >
            <SelectTrigger className="relative w-full pl-9 sm:w-[180px]" aria-label="Filter by status">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <div
        className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={loading}
          error={error}
          onRetry={() => void reload()}
          getRowId={(row) => row.id}
          onRowClick={(row) => setSelected(row)}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, totalPages, onPageChange: setPage }}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasFilters ? "No matching reports" : "No direct reports"}
              body={
                hasFilters
                  ? "Try a different search or status filter."
                  : "Employees assigned to you will appear here"
              }
            />
          }
        />
          </div>
        </>
      ) : (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4 sm:p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="ml-6 h-16 rounded-xl" />
              <Skeleton className="ml-6 h-16 rounded-xl" />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void reload()} />
          ) : reports.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No direct reports"
              body="Employees assigned to you will appear here"
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrgExpanded(new Set(orgChartIds))}
                >
                  <ChevronsUpDown aria-hidden="true" />
                  Expand all
                </Button>
                <Button variant="outline" size="sm" onClick={() => setOrgExpanded(new Set())}>
                  <ChevronsDownUp aria-hidden="true" />
                  Collapse all
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="mx-auto w-max">
                  <OrgChartTree
                    nodes={orgChartNodes}
                    expanded={orgExpanded}
                    onToggle={toggleOrgNode}
                    onOpenProfile={(id) => {
                      const employee =
                        id === selfEmployee?.id
                          ? selfEmployee
                          : reports.find((r) => r.id === id);
                      if (employee) setSelected(employee);
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail drawer. Roster is a supervisor-context surface, so sensitive fields are always
          redacted here — even for an HR viewer. HR's unredacted view lives only in the People
          directory and the structure org chart. */}
      <EmployeeProfileSheet
        employeeId={selected?.id ?? null}
        fallbackEmployee={selected}
        onClose={() => setSelected(null)}
        redacted
      />
    </div>
  );
}
