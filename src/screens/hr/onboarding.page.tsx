"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Progress,
} from "@/shared/ui";
import { DataTable, EmptyState, FilterBar, StatusBadge, type Column } from "@/shared/ui/patterns";
import { readCollection } from "@/shared/mock/db";
import type { OnboardingCase, DemoEmployee, OnboardingStatus } from "@/shared/mock/types";

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OnboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "INVITED", label: "Invited" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DOCS_REVIEW", label: "Docs review" },
  { value: "COMPLETE", label: "Complete" },
];

interface CaseRow {
  caseId: string;
  employeeId: string;
  name: string;
  email: string;
  status: OnboardingStatus;
  progress: number;
  invitedAt: string;
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

export default function OnboardingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | OnboardingStatus>(ALL);

  const rows = useMemo<CaseRow[]>(() => {
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const employees = readCollection<DemoEmployee>("employees");
    const empMap = new Map(employees.map((e) => [e.employeeId, e]));

    return cases.map((c) => {
      const emp = empMap.get(c.employeeId);
      return {
        caseId: c.id,
        employeeId: c.employeeId,
        name: emp?.displayName ?? "Unknown",
        email: emp?.email ?? "—",
        status: c.status,
        progress: c.progress,
        invitedAt: c.invitedAt,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const hasFilters = Boolean(search || statusFilter !== ALL);

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{r.name}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{r.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} dot />,
    },
    {
      header: "Progress",
      cell: (r) => (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={r.progress} className="flex-1" />
          <span className="w-8 text-right text-xs text-[color:var(--text-tertiary)]">
            {r.progress}%
          </span>
        </div>
      ),
    },
    {
      header: "Invited",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.invitedAt)}</span>
      ),
    },
    {
      header: "",
      cell: () => (
        <span className="text-xs font-medium text-[color:var(--brand-blue)] hover:underline">
          View
        </span>
      ),
      className: "w-16 text-right",
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Onboarding"
        subtitle="Track and manage employee onboarding cases."
      />

      <FilterBar aria-label="Filter onboarding cases">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search onboarding cases"
          className="sm:max-w-[320px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof ALL | OnboardingStatus)}
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
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={hasFilters ? "No matching cases" : "No onboarding cases yet"}
              body={hasFilters ? "Try a different search or filter." : undefined}
            />
          }
          onRowClick={(r) => router.push(`/hr/onboarding/${r.caseId}`)}
          getRowId={(r) => r.caseId}
        />
      </div>
    </div>
  );
}
