"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Filter, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import type {
  EmployeeListItem,
  EmployeeStatus,
} from "@/modules/people/employees/types/employees.types";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import {
  DataTable,
  type Column,
  type DataTableSort,
  EmptyState,
  StatusBadge,
  FilterBar,
  TablePagination,
} from "@/shared/ui/patterns";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  // The server-side `supervisorId` filter scopes it to this supervisor's direct reports.
  const { employees, loading, error, reload } = useEmployees({
    supervisorIds: employeeId ? [employeeId] : undefined,
    page: 1,
    limit: 100,
  });
  const reports = useMemo(() => (employeeId ? employees : []), [employeeId, employees]);

  const [selected, setSelected] = useState<EmployeeListItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "ALL">("ALL");
  const [sort, setSort] = useState<DataTableSort>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);

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
      sortKey: "name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
            aria-hidden="true"
          >
            {initials(row.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {row.fullName}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.companyEmail}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role / Department",
      sortable: true,
      sortKey: "role",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-[color:var(--text-primary)]">{row.jobTitle ?? "—"}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {row.department ?? "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Team/s",
      cell: (row) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {row.teams.length ? row.teams.map((t) => t.name).join(", ") : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      mobileLabel: "Status",
      sortable: true,
      sortKey: "status",
      cell: (row) => <StatusBadge status={row.status} dot />,
    },
  ];

  return (
    <div className="min-w-0">
      <ScreenHeader id="roster" level="page" />

      <FilterBar aria-label="Filter roster" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search roster"
            className="w-full sm:max-w-[320px]"
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
        {totalPages > 1 && (
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Employee detail sheet (redacted-safe fields only) */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                    }}
                    aria-hidden="true"
                  >
                    {initials(selected.fullName)}
                  </span>
                  <div>
                    <SheetTitle className="text-left text-base font-bold leading-tight text-[color:var(--text-primary)]">
                      {selected.fullName}
                    </SheetTitle>
                    <SheetDescription className="text-left text-sm text-[color:var(--text-secondary)]">
                      {selected.jobTitle ?? "—"}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">
                      Department
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {selected.department ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">
                      Status
                    </span>
                    <StatusBadge status={selected.status} dot />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">
                      Supervisor
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {selected.supervisor?.fullName ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">
                      Team/s
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {selected.teams.length ? selected.teams.map((t) => t.name).join(", ") : "—"}
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">
                      Company email
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {selected.companyEmail}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
