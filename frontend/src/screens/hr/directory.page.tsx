import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { FileSpreadsheet, Plus, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
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
  GroupedFilterMenu,
  PageTabs,
  SearchInput,
  StatusBadge,
  type Column,
  type DataTableSort,
  type FilterGroup,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { EmployeeDetailsModal } from "@/modules/people/employees/components/employee-details-modal";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useEmployeeStatusCounts } from "@/modules/people/employees/hooks/use-employee-status-counts";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import {
  hrDirectoryHref,
  parseDirectoryTab,
  type DirectoryTab,
} from "@/modules/people/employees/directory-routes";
import {
  AddEmployeeDialog,
  OnboardingCasesTable,
} from "@/modules/people/onboarding";
import { InitiateOffboardingDialog, OffboardingCasesTable } from "@/modules/people/offboarding";
import type {
  EmployeeListItem,
  EmployeeSortBy,
  EmployeeStatus,
  SortDirection,
} from "@/modules/people/employees/types/employees.types";

const PAGE_SIZE = 10;
const MAX_VISIBLE_TEAMS = 2;

const BulkUploadDropzone = dynamic(
  () =>
    import("@/modules/people/onboarding/components/bulk/bulk-upload-dropzone").then(
      (module) => module.BulkUploadDropzone,
    ),
  { ssr: false },
);

/** Status options for the All-tab status filter dropdown. */
const STATUS_FILTER_OPTIONS: { id: EmployeeStatus; name: string }[] = [
  { id: "onboarding", name: "Onboarding" },
  { id: "active", name: "Active" },
  { id: "offboarding", name: "Offboarding" },
  { id: "inactive", name: "Inactive" },
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
  const searchParams = useSearchParams();
  // The selected tab lives in the `?tab=` query param so it stays in sync with how tab clicks
  // navigate (see PageTabs onChange below). Missing/invalid values fall back to All.
  const tab: DirectoryTab = parseDirectoryTab(searchParams.get("tab"));
  const [search, setSearch] = useState("");
  const [teamIds, setTeamIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [departmentIds, setDepartmentIds] = useState<Set<string>>(new Set());
  const [supervisorIds, setSupervisorIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [sort, setSort] = useState<DataTableSort>({
    key: "employeeName",
    direction: "asc",
  });
  const debouncedSearch = useDebounce(search, 300);

  const { teams, loading: teamsLoading } = useTeams({ page: 1, limit: 100 });
  const { departments, loading: departmentsLoading } = useDepartments();
  const counts = useEmployeeStatusCounts();
  // Supervisor filter options — any employee can be a supervisor.
  const { employees: supervisorOptions } = useEmployees({ limit: 100 });

  const { employees, meta, loading, error, reload } = useEmployees({
    search: debouncedSearch || undefined,
    teamIds: teamIds.size > 0 ? Array.from(teamIds) : undefined,
    statuses: statuses.size > 0 ? (Array.from(statuses) as EmployeeStatus[]) : undefined,
    departmentIds: departmentIds.size > 0 ? Array.from(departmentIds) : undefined,
    supervisorIds: supervisorIds.size > 0 ? Array.from(supervisorIds) : undefined,
    sortBy: sort.key as EmployeeSortBy,
    sortDirection: sort.direction as SortDirection,
    page,
    limit: PAGE_SIZE,
  });

  const hasFilters =
    Boolean(search) ||
    teamIds.size > 0 ||
    statuses.size > 0 ||
    departmentIds.size > 0 ||
    supervisorIds.size > 0;

  // The team/department/status/supervisor filters are grouped behind a single "Filter" dropdown.
  // Status and supervisor only apply on the All tab, so they are appended conditionally.
  const filterGroups: FilterGroup[] = [
    {
      key: "teams",
      label: "Filter by teams",
      options: teams.map((team) => ({ id: team.id, name: team.name })),
      selected: teamIds,
      onChange: (next) => {
        setTeamIds(next);
        setPage(1);
      },
      searchPlaceholder: "Search teams…",
      emptyText: teamsLoading ? "Loading teams…" : "No teams found.",
    },
    {
      key: "departments",
      label: "Filter by departments",
      options: departments.map((department) => ({ id: department.id, name: department.name })),
      selected: departmentIds,
      onChange: (next) => {
        setDepartmentIds(next);
        setPage(1);
      },
      searchPlaceholder: "Search departments…",
      emptyText: departmentsLoading ? "Loading departments…" : "No departments found.",
    },
    ...(tab === "all"
      ? ([
          {
            key: "status",
            label: "Filter by status",
            options: STATUS_FILTER_OPTIONS.map((status) => ({ id: status.id, name: status.name })),
            selected: statuses,
            onChange: (next) => {
              setStatuses(next);
              setPage(1);
            },
            searchPlaceholder: "Search statuses…",
            emptyText: "No statuses found.",
          },
          {
            key: "supervisors",
            label: "Filter by supervisors",
            options: supervisorOptions.map((employee) => ({
              id: employee.id,
              name: employee.fullName,
            })),
            selected: supervisorIds,
            onChange: (next) => {
              setSupervisorIds(next);
              setPage(1);
            },
            searchPlaceholder: "Search supervisors…",
            emptyText: "No employees found.",
          },
        ] as FilterGroup[])
      : []),
  ];

  const columns: Column<EmployeeListItem>[] = [
    {
      header: "Employee name",
      className: "min-w-[220px]",
      sortable: true,
      sortKey: "employeeName",
      cell: (employee) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            src={employee.avatarUrl}
            fallback={initials(employee)}
            className="h-8 w-8"
            fallbackClassName="text-[12px] font-bold text-[color:var(--text-primary)]"
            fallbackStyle={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
          />
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
            {/* Adding a person always starts an onboarding case, so the action lives on that tab. */}
            {tab === "onboarding" ? (
              <>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => router.push("/hr/configurations?tab=onboarding")}
                >
                  <Settings2 aria-hidden="true" /> Onboarding setup
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setBulkOpen(true)}
                >
                  <FileSpreadsheet aria-hidden="true" /> Bulk upload
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
                  <Plus /> Onboard new employee
                </Button>
              </>
            ) : null}
            {tab === "offboarding" ? (
              <>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => router.push("/hr/configurations?tab=clearances")}
                >
                  <Settings2 aria-hidden="true" /> Clearance setup
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => setInitiateOpen(true)}>
                  <Plus /> Initiate offboarding
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <PageTabs
        ariaLabel="Employee segments"
        value={tab}
        onChange={(nextTab) => {
          router.replace(hrDirectoryHref(nextTab as DirectoryTab));
          setPage(1);
        }}
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
            <SearchInput
              value={search}
              onValueChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              aria-label="Search employees"
              containerClassName="sm:max-w-[320px]"
            />
            <GroupedFilterMenu groups={filterGroups} ariaLabel="Filter employees" />
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

      {bulkOpen ? <BulkUploadDropzone open={bulkOpen} onOpenChange={setBulkOpen} /> : null}

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
