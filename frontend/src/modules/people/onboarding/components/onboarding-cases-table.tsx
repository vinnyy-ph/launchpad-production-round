"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Progress } from "@/shared/ui/primitives/progress";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import {
  DataTable,
  EmptyState,
  FilterBar,
  SearchInput,
  StatCard,
  StatusBadge,
  type Column,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { matchesSearchTerms } from "@/shared/lib/search";
import { InviteStatusBadge } from "./invite-status-badge";
import { useOnboardingRecords } from "../hooks/use-onboarding-records";
import type { DocumentReview, OnboardingInvitationStatus } from "../types/onboarding.types";

/** A single onboarding case row (mirrors the standalone onboarding screen). */
interface CaseRow {
  employeeId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  progress: number;
  invitationStatus: OnboardingInvitationStatus | null;
  documentsApproved: number;
  documentsRequired: number;
  customFieldsFilled: number;
  customFieldsRequired: number;
  stuckAt: string;
}

const ALL = "ALL";

/** Two-letter initials for the default avatar fallback. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

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

function ratioProgress(done: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((done / total) * 100);
}

function deriveStuckAt(row: {
  invitationStatus: OnboardingInvitationStatus | null;
  documentsApproved: number;
  documentsRequired: number;
  customFieldsFilled: number;
  customFieldsRequired: number;
}): string {
  if (!row.invitationStatus) return "Invite not sent";
  if (row.invitationStatus === "failed_delivery") return "Invite delivery failed";
  if (row.invitationStatus === "expired") return "Invite expired";
  if (row.invitationStatus === "pending") return "Awaiting invite acceptance";
  if (row.documentsApproved < row.documentsRequired) return "Documents pending";
  if (row.customFieldsFilled < row.customFieldsRequired) return "Profile fields pending";
  return "Onboarded";
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

  const { employees, reviews, invitationStatusByEmployeeId, statusByEmployeeId, loading, error, reload } =
    useOnboardingRecords();

  const rows = useMemo<CaseRow[]>(
    () =>
      employees.map((employee) => {
        const status = statusByEmployeeId.get(employee.id);
        const documents = status?.documents.filter((document) => document.isRequired) ?? [];
        const customFields = status?.customFields.filter((field) => field.isRequired) ?? [];
        const documentsApproved = documents.filter(
          (document) => document.latestSubmission?.status === "approved",
        ).length;
        const customFieldsFilled = customFields.filter((field) => Boolean(field.value?.trim())).length;
        const documentsRequired = documents.length;
        const customFieldsRequired = customFields.length;
        const invitationStatus = invitationStatusByEmployeeId.get(employee.id) ?? null;
        const progress =
          status
            ? ratioProgress(documentsApproved + customFieldsFilled, documentsRequired + customFieldsRequired)
            : deriveProgress(employee.id, reviews);
        const row = {
          employeeId: employee.id,
          name: employee.fullName,
          email: employee.companyEmail,
          avatarUrl: employee.avatarUrl,
          status: employee.status,
          progress,
          invitationStatus,
          documentsApproved,
          documentsRequired,
          customFieldsFilled,
          customFieldsRequired,
          stuckAt: "",
        };

        return { ...row, stuckAt: deriveStuckAt(row) };
      }),
    [employees, reviews, invitationStatusByEmployeeId, statusByEmployeeId],
  );

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      // Match full name (first/middle/last, already joined in `name`) and email, term by term.
      const matchesSearch = matchesSearchTerms(debouncedSearch, `${row.name} ${row.email}`);
      const matchesStatus = statusFilter === ALL || row.invitationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, debouncedSearch, statusFilter]);

  const hasFilters = Boolean(search || statusFilter !== ALL);
  const pendingInvites = rows.filter((row) => row.invitationStatus === "pending").length;
  const inviteIssues = rows.filter(
    (row) => row.invitationStatus === "expired" || row.invitationStatus === "failed_delivery",
  ).length;
  const inProgress = rows.filter((row) => row.invitationStatus === "accepted").length;
  const onboarded = rows.filter((row) => row.stuckAt === "Onboarded").length;

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            src={row.avatarUrl}
            fallback={initials(row.name)}
            className="h-8 w-8"
            fallbackClassName="text-[12px] font-bold text-[color:var(--text-primary)]"
            fallbackStyle={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
          />
          <div className="min-w-0">
            <p title={row.name} className="truncate text-sm font-medium text-[color:var(--text-primary)]">{row.name}</p>
            <p title={row.email} className="truncate text-xs text-[color:var(--text-tertiary)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Invite status",
      cell: (row) => <InviteStatusBadge status={row.invitationStatus} dot />,
    },
    {
      header: "Documents",
      cell: (row) => (
        <div className="min-w-[140px]">
          <p className="text-sm font-medium text-[color:var(--text-primary)]">
            {row.documentsApproved}/{row.documentsRequired} approved
          </p>
          <Progress value={ratioProgress(row.documentsApproved, row.documentsRequired)} className="mt-2" />
        </div>
      ),
    },
    {
      header: "Profile fields",
      cell: (row) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {row.customFieldsFilled}/{row.customFieldsRequired} filled
        </span>
      ),
    },
    {
      header: "Stuck at",
      cell: (row) => (
        <div className="flex min-w-[180px] flex-col gap-1">
          <span className="text-sm font-medium text-[color:var(--text-primary)]">{row.stuckAt}</span>
          <div className="flex items-center gap-2">
            <Progress value={row.progress} className="max-w-[100px] flex-1" />
            <span className="w-8 text-right text-xs text-[color:var(--text-tertiary)]">
              {row.progress}%
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} dot />,
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending invites" value={pendingInvites} loading={loading} variant="warn" />
        <StatCard label="Invite issues" value={inviteIssues} loading={loading} variant={inviteIssues > 0 ? "alert" : "default"} />
        <StatCard label="In progress" value={inProgress} loading={loading} variant="brand" />
        <StatCard label="Onboarded" value={onboarded} loading={loading} />
      </div>

      <FilterBar aria-label="Filter onboarding cases">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search by name or email…"
          aria-label="Search onboarding cases"
          containerClassName="sm:max-w-[320px]"
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
          onRowClick={(row) => router.push(`/hr/directory/onboarding/${row.employeeId}`)}
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
        />
      </div>
    </>
  );
}
