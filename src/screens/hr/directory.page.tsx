import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { DataTable, EmptyState, FilterBar, StatusBadge, type Column } from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import type {
  EmployeeListItem,
  EmployeeStatus,
} from "@/modules/people/employees/types/employees.types";

const ALL = "ALL";
const STATUS_OPTIONS: { value: typeof ALL | EmployeeStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "ACTIVE", label: "Active" },
  { value: "OFFBOARDING", label: "Offboarding" },
  { value: "INACTIVE", label: "Inactive" },
];

function fullName(e: EmployeeListItem): string {
  return [e.firstName, e.lastName].filter(Boolean).join(" ") || e.companyEmail;
}

function initials(e: EmployeeListItem): string {
  const letters = (e.firstName?.[0] ?? "") + (e.lastName?.[0] ?? "");
  return (letters || e.companyEmail[0]).toUpperCase();
}

export default function DirectoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | EmployeeStatus>("");
  const debouncedSearch = useDebounce(search, 300);

  const { employees, loading, error, reload } = useEmployees({
    search: debouncedSearch || undefined,
    status: status || undefined,
  });

  const hasFilters = Boolean(search || status);

  const columns: Column<EmployeeListItem>[] = [
    {
      header: "Name",
      cell: (e) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {initials(e)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {fullName(e)}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">{e.companyEmail}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (e) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-[color:var(--text-secondary)]">{e.jobTitle ?? "—"}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {e.departmentName ?? "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Supervisor",
      cell: (e) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{e.supervisorName ?? "—"}</span>
      ),
    },
    {
      header: "Status",
      cell: (e) => <StatusBadge status={e.employeeStatus} />,
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Directory"
        subtitle="Search and manage employees across the organization."
        action={
          <Button onClick={() => router.push("/hr/onboarding")}>
            <Plus /> Add employee
          </Button>
        }
      />

      <FilterBar aria-label="Filter employees">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search employees"
          className="sm:max-w-[320px]"
        />
        <Select
          value={status || ALL}
          onValueChange={(v) => setStatus(v === ALL ? "" : (v as EmployeeStatus))}
        >
          <SelectTrigger className="sm:w-[200px]" aria-label="Filter by status">
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
          onRowClick={(e) => router.push(`/hr/directory/${e.id}`)}
          getRowId={(e) => e.id}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasFilters ? "No matching employees" : "No employees yet"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Add your first employee to get started."
              }
              action={
                hasFilters
                  ? undefined
                  : { label: "Add employee", onClick: () => router.push("/hr/onboarding") }
              }
            />
          }
        />
      </div>
    </div>
  );
}
