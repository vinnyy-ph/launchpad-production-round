import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
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
  StatusBadge,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useTeams } from "@/modules/people/teams/hooks/use-teams";
import type {
  EmployeeListItem,
  EmployeeSortBy,
  EmployeeStatus,
  SortDirection,
} from "@/modules/people/employees/types/employees.types";

const ALL = "ALL";
const ALL_TEAMS = "ALL_TEAMS";
const PAGE_SIZE = 10;

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

  const [primaryTeam] = teams;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex max-w-[220px] items-center justify-center gap-1.5">
            <Badge variant="secondary" className="max-w-[150px] truncate">
              {primaryTeam.name}
            </Badge>
            {teams.length > 1 ? (
              <Badge
                variant="outline"
                className="border-[color:var(--border-secondary)] bg-white text-[color:var(--text-secondary)]"
                aria-label={`${teams.length} teams total`}
              >
                {teams.length}+
              </Badge>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-white text-[color:var(--text-secondary)] shadow-md">
          <ul className="space-y-1">
            {teams.map((team) => (
              <li key={team.id} className="whitespace-nowrap">
                {team.name}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DirectoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState<"" | EmployeeStatus>("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort>({
    key: "employeeName",
    direction: "asc",
  });
  const debouncedSearch = useDebounce(search, 300);
  const { teams, loading: teamsLoading } = useTeams({ page: 1, limit: 100 });

  const { employees, meta, loading, error, reload } = useEmployees({
    search: debouncedSearch || undefined,
    teamId: teamId || undefined,
    status: status || undefined,
    sortBy: sort.key as EmployeeSortBy,
    sortDirection: sort.direction as SortDirection,
    page,
    limit: PAGE_SIZE,
  });

  const hasFilters = Boolean(search || teamId || status);
  const viewEmployee = (id: string) => router.push(`/hr/directory/${id}`);

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
        title="Directory"
        subtitle="Search and manage employees across the organization."
      />

      <FilterBar aria-label="Filter employees" className="sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
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
          <Select
            value={status || ALL}
            onValueChange={(value) => {
              setStatus(value === ALL ? "" : (value as EmployeeStatus));
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
        </div>
        <Button className="w-full sm:w-auto" onClick={() => router.push("/hr/onboarding")}>
          <Plus /> Add employee
        </Button>
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
          onRowClick={(employee) => viewEmployee(employee.id)}
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
              title={hasFilters ? "No matching employees" : "No employees yet"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Add your first employee to get started."
              }
            />
          }
        />
      </div>
    </div>
  );
}
