"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { DataTable, EmptyState, FilterBar, SearchInput, StatusBadge, type Column } from "@/shared/ui/patterns";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { matchesSearchTerms } from "@/shared/lib/search";
import { useOffboardings } from "../hooks/use-offboarding";
import type { OffboardingListItem, OffboardingStatus } from "../types/offboarding.types";

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OffboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function fullName(e: { firstName: string; lastName: string }): string {
  return `${e.firstName} ${e.lastName}`.trim();
}

/** Two-letter initials for the default avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * HR offboarding cases table — the same setup and appearance as the former standalone
 * Offboarding screen, shared so the People directory's Offboarding tab stays in sync.
 * Self-contained: owns its search + status filter; rows open the offboarding detail page.
 */
export function OffboardingCasesTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | OffboardingStatus>(ALL);
  const debouncedSearch = useDebounce(search, 300);
  const { offboardings, loading, error, reload } = useOffboardings();

  const filtered = useMemo(() => {
    return offboardings.filter((r) => {
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
      // Match full name (first/middle/last) and email, term by term.
      const e = r.employee;
      const haystack = `${e.firstName} ${e.middleName ?? ""} ${e.lastName} ${e.companyEmail ?? ""}`;
      const matchesSearch = matchesSearchTerms(debouncedSearch, haystack);
      return matchesStatus && matchesSearch;
    });
  }, [offboardings, debouncedSearch, statusFilter]);

  const hasFilters = Boolean(search.trim() || statusFilter !== ALL);

  const columns: Column<OffboardingListItem>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            src={r.employee.avatarUrl}
            fallback={initials(fullName(r.employee))}
            className="h-8 w-8"
            fallbackClassName="text-[12px] font-bold text-[color:var(--text-primary)]"
            fallbackStyle={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
          />
          <div className="min-w-0">
            <p title={fullName(r.employee)} className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {fullName(r.employee)}
            </p>
            <p
              title={`${r.employee.jobTitle ?? "—"}${r.employee.department ? ` · ${r.employee.department}` : ""}`}
              className="truncate text-xs text-[color:var(--text-tertiary)]"
            >
              {r.employee.jobTitle ?? "—"}
              {r.employee.department ? ` · ${r.employee.department}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Tender date",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.tenderDate)}</span>
      ),
    },
    {
      header: "Effective date",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatDate(r.effectiveDate)}
        </span>
      ),
    },
    {
      header: "Clearances",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {r.signedCount}/{r.totalCount} signed
        </span>
      ),
    },
  ];

  return (
    <>
      <FilterBar aria-label="Filter offboarding cases">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search by name…"
          aria-label="Search employees"
          containerClassName="sm:max-w-[320px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof ALL | OffboardingStatus)}
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
          data={filtered}
          isLoading={loading}
          error={error}
          onRetry={reload}
          emptyState={
            <EmptyState
              icon={LogOut}
              title={hasFilters ? "No matching cases" : "No offboarding cases"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Initiate offboarding to start a clearance process."
              }
              action={
                hasFilters
                  ? {
                      label: "Clear filters",
                      onClick: () => {
                        setSearch("");
                        setStatusFilter(ALL);
                      },
                    }
                  : undefined
              }
            />
          }
          onRowClick={(r) => router.push(`/hr/directory/offboarding/${r.id}`)}
          getRowId={(r) => r.id}
        />
      </div>
    </>
  );
}
