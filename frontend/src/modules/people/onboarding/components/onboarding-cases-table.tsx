"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Progress } from "@/shared/ui/primitives/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { DataTable, EmptyState, FilterBar, StatusBadge, type Column } from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { InviteStatusBadge } from "./invite-status-badge";
import { useOnboardingRecords } from "../hooks/use-onboarding-records";
import type { DocumentReview, OnboardingInvitationStatus } from "../types/onboarding.types";

/** A single onboarding case row (mirrors the standalone onboarding screen). */
interface CaseRow {
  employeeId: string;
  name: string;
  email: string;
  status: string;
  progress: number;
  invitationStatus: OnboardingInvitationStatus | null;
}

const ALL = "ALL";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "pending", label: "Invited" },
  { value: "accepted", label: "In progress" },
  { value: "expired", label: "Expired" },
  { value: "failed_delivery", label: "Delivery failed" },
];

/** Coarse progress: share of an employee's document submissions that are approved. */
function deriveProgress(employeeId: string, reviews: DocumentReview[]): number {
  const mine = reviews.filter((review) => review.employee.id === employeeId);
  if (mine.length === 0) return 0;
  const approved = mine.filter((review) => review.status === "approved").length;
  return Math.round((approved / mine.length) * 100);
}

/**
 * HR onboarding cases table — the same setup and appearance as the standalone Onboarding
 * screen, shared so the People directory's Onboarding tab stays in sync. Self-contained:
 * owns its search + invite-status filter; rows open the onboarding detail page.
 */
export function OnboardingCasesTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const debouncedSearch = useDebounce(search, 300);

  const { employees, reviews, invitationStatusByEmployeeId, loading, error, reload } =
    useOnboardingRecords();

  const rows = useMemo<CaseRow[]>(
    () =>
      employees.map((employee) => ({
        employeeId: employee.id,
        name: employee.fullName,
        email: employee.companyEmail,
        status: employee.status,
        progress: deriveProgress(employee.id, reviews),
        invitationStatus: invitationStatusByEmployeeId.get(employee.id) ?? null,
      })),
    [employees, reviews, invitationStatusByEmployeeId],
  );

  const filtered = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    return rows.filter((row) => {
      const matchesSearch =
        !query || row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || row.invitationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, debouncedSearch, statusFilter]);

  const hasFilters = Boolean(search || statusFilter !== ALL);

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{row.name}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.email}</p>
        </div>
      ),
    },
    {
      header: "Invite status",
      cell: (row) => <InviteStatusBadge status={row.invitationStatus} dot />,
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} dot />,
    },
    {
      header: "Documents",
      cell: (row) => (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={row.progress} className="flex-1" />
          <span className="w-8 text-right text-xs text-[color:var(--text-tertiary)]">
            {row.progress}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      <FilterBar aria-label="Filter onboarding cases">
        <Input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search onboarding cases"
          className="sm:max-w-[320px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[200px]" aria-label="Filter by invite status">
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
          onRowClick={(row) => router.push(`/hr/onboarding/${row.employeeId}`)}
          getRowId={(row) => row.employeeId}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={hasFilters ? "No matching cases" : "No one's onboarding right now"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Add an employee to send their first invite."
              }
            />
          }
        />
      </div>
    </>
  );
}
