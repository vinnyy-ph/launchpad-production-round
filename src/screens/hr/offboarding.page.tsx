"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  EmptyState,
  FilterBar,
  StatusBadge,
  type Column,
} from "@/shared/ui";
import { readCollection } from "@/shared/mock/db";
import type { OffboardingCase, DemoEmployee } from "@/shared/mock/types";

type OffboardingStatus = OffboardingCase["status"];

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OffboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "INITIATED", label: "Initiated" },
  { value: "CLEARANCES", label: "Clearances" },
  { value: "COMPLETE", label: "Complete" },
];

interface CaseRow {
  id: string;
  employeeId: string;
  displayName: string;
  email: string;
  status: OffboardingStatus;
  lastDay: string;
  reason: string;
  clearanceSigned: number;
  clearanceTotal: number;
}

function buildRows(
  cases: OffboardingCase[],
  employees: DemoEmployee[],
): CaseRow[] {
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));
  return cases.map((c) => {
    const emp = empMap.get(c.employeeId);
    const signed = c.clearances.filter((cl) => cl.status === "SIGNED").length;
    return {
      id: c.id,
      employeeId: c.employeeId,
      displayName: emp?.displayName ?? c.employeeId,
      email: emp?.email ?? "—",
      status: c.status,
      lastDay: c.lastDay,
      reason: c.reason,
      clearanceSigned: signed,
      clearanceTotal: c.clearances.length,
    };
  });
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

export default function OffboardingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | OffboardingStatus>(ALL);

  const rows = useMemo<CaseRow[]>(() => {
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const employees = readCollection<DemoEmployee>("employees");
    return buildRows(cases, employees);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
      const matchesSearch =
        !q ||
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const hasFilters = Boolean(search.trim() || statusFilter !== ALL);

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {r.displayName}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{r.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Last Day",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.lastDay)}</span>
      ),
    },
    {
      header: "Reason",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{r.reason}</span>
      ),
    },
    {
      header: "Clearances",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {r.clearanceSigned}/{r.clearanceTotal} signed
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Offboarding"
        subtitle="Track and manage employee offboarding clearances."
      />

      <FilterBar aria-label="Filter offboarding cases">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search employees"
          className="sm:max-w-[320px]"
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
          emptyState={
            <EmptyState
              icon={LogOut}
              title={hasFilters ? "No matching cases" : "No offboarding cases"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Active offboarding cases will appear here."
              }
            />
          }
          onRowClick={(r) => router.push(`/hr/offboarding/${r.id}`)}
          getRowId={(r) => r.id}
        />
      </div>
    </div>
  );
}
