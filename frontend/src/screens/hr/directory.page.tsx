import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";
import {
  DataTable,
  EmptyState,
  FilterBar,
  MultiSelectFilter,
  PageTabs,
  StatusBadge,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { EmployeeDetailsModal } from "@/modules/people/employees/components/employee-details-modal";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useEmployeeStatusCounts } from "@/modules/people/employees/hooks/use-employee-status-counts";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import { AddEmployeeDialog, OnboardingCasesTable } from "@/modules/people/onboarding";
import { InitiateOffboardingDialog, OffboardingCasesTable } from "@/modules/people/offboarding";
import type {
  EmployeeListItem,
  EmployeeSortBy,
  EmployeeStatus,
  SortDirection,
} from "@/modules/people/employees/types/employees.types";

const ALL = "ALL";
const ALL_TEAMS = "ALL_TEAMS";
const PAGE_SIZE = 10;
const MAX_VISIBLE_TEAMS = 2;

/** Directory segments shown as tabs. */
type DirectoryTab = "all" | "onboarding" | "offboarding";

/** Status options for the All-tab status filter dropdown. */
const STATUS_OPTIONS: { value: typeof ALL | EmployeeStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "offboarding", label: "Offboarding" },
  { value: "inactive", label: "Inactive" },
];

function fullName(employee: EmployeeListItem): string {
  return (
    employee.fullName ||
    [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")
  );
}

function initials(employee: EmployeeListItem): string {
  const letters = (employee.firstName?.[0] ?? "") + (employee.lastName?.[0] ?? "");
  return (letters || employee.companyEmail[0]).toUpperCase();
}

function TeamsCell({ teams }: { teams: EmployeeListItem["teams"] }) {
  if (teams.length === 0) {
    return <span className="text-sm text-[color:var(--text-tertiary)]">-</span>;
  }

  const visibleTeams = teams.slice(0, MAX_VISIBLE_TEAMS);
  const overflowTeams = teams.slice(MAX_VISIBLE_TEAMS);
  const overflowCount = overflowTeams.length;

  const teamBadgeClassName =
    "max-w-[110px] truncate rounded-full border-[#B2DDFF] bg-[#EFF8FF] font-semibold text-[#175CD3]";

  return (
    <div className="inline-flex max-w-[260px] flex-wrap items-center justify-center gap-1.5">
      {visibleTeams.map((team) => (
        <Badge key={team.id} variant="outline" pill className={teamBadgeClassName}>
          {team.name}
        </Badge>
      ))}

      {overflowCount > 0 ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${overflowCount} more teams`}
                onClick={(event) => event.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  pill
                  className="border-transparent bg-white font-semibold text-[color:var(--text-secondary)] shadow-sm"
                >
                  +{overflowCount}
                </Badge>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-[260px] rounded-md border border-[color:var(--border-primary)] bg-white p-3 text-[color:var(--text-secondary)] shadow-xl"
            >
              <p className="mb-2 text-xs font-bold text-[color:var(--text-primary)]">More Teams:</p>
              <div className="flex flex-wrap gap-2">
                {overflowTeams.map((team) => (
                  <Badge key={team.id} variant="outline" pill className={teamBadgeClassName}>
                    {team.name}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}


export default function DirectoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  // Onboarding and Offboarding are deep-linkable routes nested under the People directory.
  const isOnboardingRoute = pathname === "/hr/directory/onboarding";
  const isOffboardingRoute = pathname === "/hr/directory/offboarding";
  const tab: DirectoryTab = isOnboardingRoute
    ? "onboarding"
    : isOffboardingRoute
      ? "offboarding"
      : "all";
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | EmployeeStatus>("");
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(new Set());
  const [supervisorIds, setSupervisorIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [sort, setSort] = useState<DataTableSort>({
    key: "employeeName",
    direction: "asc",
  });
  const debouncedSearch = useDebounce(search, 300);

  // Each tab is its own route, so switching tabs is a navigation.
  const handleTabChange = (nextTab: DirectoryTab) => {
    const href =
      nextTab === "onboarding"
        ? "/hr/directory/onboarding"
        : nextTab === "offboarding"
          ? "/hr/directory/offboarding"
          : "/hr/directory";
    router.push(href);
  };

  const { teams, loading: teamsLoading } = useTeams({ page: 1, limit: 100 });
  const { departments, loading: departmentsLoading } = useDepartments();
  const counts = useEmployeeStatusCounts();
  // Supervisor filter options — any employee can be a supervisor.
  const { employees: supervisorOptions } = useEmployees({ limit: 100 });

  const { employees, meta, loading, error, reload } = useEmployees({
    search: debouncedSearch || undefined,
    teamId: teamId || undefined,
    status: statusFilter || undefined,
    departmentIds: departmentIds.size > 0 ? Array.from(departmentIds) : undefined,
    supervisorIds: supervisorIds.size > 0 ? Array.from(supervisorIds) : undefined,
    sortBy: sort.key as EmployeeSortBy,
    sortDirection: sort.direction as SortDirection,
    page,
    limit: PAGE_SIZE,
  });

  const hasFilters =
    Boolean(search || teamId || statusFilter) || departmentIds.size > 0 || supervisorIds.size > 0;

  const columns: Column<EmployeeListItem>[] = [
    {
      header: "Employee name",
      className: "min-w-[220px]",
      sortable: true,
      sortKey: "employeeName",
      cell: (employee) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {initials(employee)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {fullName(employee)}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">
              {employee.companyEmail}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Job Title",
      className: "min-w-[160px] text-center",
      sortable: true,
      sortKey: "jobTitle",
      cell: (employee) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {employee.jobTitle ?? "-"}
        </span>
      ),
    },
    {
      header: "Department",
      className: "min-w-[150px] text-center",
      sortable: true,
      sortKey: "department",
      cell: (employee) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {employee.department ?? "-"}
        </span>
      ),
    },
    {
      header: "Supervisor",
      className: "min-w-[170px] text-center",
      sortable: true,
      sortKey: "supervisor",
      cell: (employee) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {employee.supervisor?.fullName ?? "-"}
        </span>
      ),
    },
    {
      header: "Team/s",
      className: "min-w-[190px] text-center",
      sortable: true,
      sortKey: "teams",
      cell: (employee) => <TeamsCell teams={employee.teams} />,
    },
    {
      header: "Status",
      className: "min-w-[120px] text-center",
      sortable: true,
      sortKey: "status",
      cell: (employee) => <StatusBadge status={employee.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="People"
        subtitle="Everyone at DG Technologies, from new hires to active staff."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {tab === "onboarding" ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/hr/directory/onboarding/settings")}
              >
                <Settings2 aria-hidden="true" /> Onboarding setup
              </Button>
            ) : null}
            {tab === "offboarding" ? (
              <Button className="w-full sm:w-auto" onClick={() => setInitiateOpen(true)}>
                <Plus /> Initiate offboarding
              </Button>
            ) : (
              <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
                <Plus /> Add employee
              </Button>
            )}
          </div>
        }
      />

      <PageTabs
        ariaLabel="Employee segments"
        value={tab}
        onChange={(nextTab) => handleTabChange(nextTab as DirectoryTab)}
        items={[
          { value: "all", label: "All", count: counts.all },
          { value: "onboarding", label: "Onboarding", count: counts.onboarding },
          { value: "offboarding", label: "Offboarding", count: counts.offboarding },
        ]}
      />

      {tab === "onboarding" ? (
        <OnboardingCasesTable />
      ) : tab === "offboarding" ? (
        <OffboardingCasesTable />
      ) : (
        <>
          <FilterBar aria-label="Filter employees">
            <Input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              aria-label="Search employees"
              className="sm:max-w-[320px]"
            />
            <Select
              value={teamId || ALL_TEAMS}
              onValueChange={(value) => {
                setTeamId(value === ALL_TEAMS ? "" : value);
                setPage(1);
              }}
              disabled={teamsLoading}
            >
              <SelectTrigger className="sm:w-[220px]" aria-label="Filter by team">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS}>All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MultiSelectFilter
              options={departments.map((department) => ({
                id: department.id,
                name: department.name,
              }))}
              selected={departmentIds}
              onChange={(next) => {
                setDepartmentIds(next);
                setPage(1);
              }}
              allLabel="All departments"
              countNoun="departments"
              searchPlaceholder="Search departments…"
              emptyText={departmentsLoading ? "Loading departments…" : "No departments found."}
              ariaLabel="Filter by department"
            />
            {tab === "all" ? (
              <Select
                value={statusFilter || ALL}
                onValueChange={(value) => {
                  setStatusFilter(value === ALL ? "" : (value as EmployeeStatus));
                  setPage(1);
                }}
              >
                <SelectTrigger className="sm:w-[200px]" aria-label="Filter by status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {tab === "all" ? (
              <MultiSelectFilter
                options={supervisorOptions.map((employee) => ({
                  id: employee.id,
                  name: employee.fullName,
                }))}
                selected={supervisorIds}
                onChange={(next) => {
                  setSupervisorIds(next);
                  setPage(1);
                }}
                allLabel="All supervisors"
                countNoun="supervisors"
                searchPlaceholder="Search supervisors…"
                emptyText="No employees found."
                ariaLabel="Filter by supervisor"
              />
            ) : null}
          </FilterBar>

          <div
            className="rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <DataTable
              columns={columns}
              data={employees}
              isLoading={loading}
              error={error}
              onRetry={() => void reload()}
              onRowClick={setSelectedEmployee}
              getRowId={(employee) => employee.id}
              sort={sort}
              onSortChange={(nextSort) => {
                setSort(nextSort);
                setPage(1);
              }}
              pagination={
                meta
                  ? {
                      page: meta.page,
                      totalPages: meta.totalPages,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyState={
                <EmptyState
                  icon={Users}
                  title={hasFilters ? "No one matches that" : "No employees yet"}
                  body={
                    hasFilters
                      ? "Try a different name, team, department, status, or supervisor."
                      : "Add your first employee to get started."
                  }
                />
              }
            />
          </div>
        </>
      )}

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onStarted={(employeeId) => router.push(`/hr/directory/onboarding/${employeeId}`)}
      />

      {tab === "offboarding" ? (
        <InitiateOffboardingDialog
          open={initiateOpen}
          onOpenChange={setInitiateOpen}
          onInitiated={(caseId) => router.push(`/hr/directory/offboarding/${caseId}`)}
        />
      ) : null}

      <EmployeeDetailsModal
        employeeId={selectedEmployee?.id ?? null}
        fallbackEmployee={selectedEmployee}
        open={Boolean(selectedEmployee)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedEmployee(null);
        }}
      />
    </div>
  );
}
