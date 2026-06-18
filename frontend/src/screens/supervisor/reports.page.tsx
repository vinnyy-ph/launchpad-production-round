import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection } from "@/shared/mock/db";
import type { DemoEmployee } from "@/shared/mock/types";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatCard, DataTable, type Column, EmptyState, StatusBadge } from "@/shared/ui/patterns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui";

// ─── Hook ────────────────────────────────────────────────────────────────────

function useTeamReports(supervisorId: string | undefined) {
  const [reports, setReports] = useState<DemoEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const all = readCollection<DemoEmployee>("employees");
      setReports(all.filter((e) => e.supervisorId === supervisorId));
    } catch {
      setError("Failed to load team. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [supervisorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { reports, loading, error, reload: load };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { appUser } = useAuth();
  const { reports, loading, error, reload } = useTeamReports(appUser?.employeeId);
  const [selectedEmployee, setSelectedEmployee] = useState<DemoEmployee | null>(null);

  // Resolve supervisor name for the sheet
  const supervisorName = useCallback(
    (supId: string | null) => {
      if (!supId) return "None";
      return reports.find((r) => r.employeeId === supId)?.displayName ?? supId;
    },
    [reports],
  );

  const stats = {
    total: reports.length,
    active: reports.filter((r) => r.employeeStatus === "ACTIVE").length,
    onboarding: reports.filter((r) => r.employeeStatus === "ONBOARDING").length,
    offboarding: reports.filter((r) => r.employeeStatus === "OFFBOARDING").length,
  };

  const columns: Column<DemoEmployee>[] = [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
            }}
            aria-hidden="true"
          >
            {initials(row.displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
              {row.displayName}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role / Department",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-[color:var(--text-primary)]">{row.jobTitle}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.department}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => <StatusBadge status={row.employeeStatus} dot />,
    },
    {
      header: "Start date",
      cell: (row) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatDate(row.startDate)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="My team"
        subtitle="Direct reports assigned to you"
        level="page"
      />

      {/* Stat cards */}
      {error ? (
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <button
            onClick={reload}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Headcount" value={loading ? "—" : stats.total} variant="brand" />
          <StatCard label="Active" value={loading ? "—" : stats.active} />
          <StatCard
            label="Onboarding"
            value={loading ? "—" : stats.onboarding}
            variant={stats.onboarding > 0 ? "warn" : "default"}
          />
          <StatCard
            label="Offboarding"
            value={loading ? "—" : stats.offboarding}
            variant={stats.offboarding > 0 ? "alert" : "default"}
          />
        </div>
      )}

      {/* Team table */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Direct reports
        </h2>
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <DataTable
            columns={columns}
            data={error ? [] : reports}
            isLoading={loading}
            error={null}
            getRowId={(row) => row.employeeId}
            onRowClick={(row) => setSelectedEmployee(row)}
            emptyState={
              <EmptyState
                icon={Users}
                title="No direct reports"
                body="Employees assigned to you will appear here"
              />
            }
          />
        </div>
      </section>

      {/* Employee detail sheet */}
      <Sheet open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selectedEmployee && (
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
                    {initials(selectedEmployee.displayName)}
                  </span>
                  <div>
                    <SheetTitle className="text-left text-base font-bold leading-tight text-[color:var(--text-primary)]">
                      {selectedEmployee.displayName}
                    </SheetTitle>
                    <SheetDescription className="text-left text-sm text-[color:var(--text-secondary)]">
                      {selectedEmployee.jobTitle}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4" style={{ boxShadow: "var(--shadow-xs)" }}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Department</span>
                    <span className="text-sm text-[color:var(--text-primary)]">{selectedEmployee.department}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Status</span>
                    <StatusBadge status={selectedEmployee.employeeStatus} dot />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Supervisor</span>
                    <span className="text-sm text-[color:var(--text-primary)]">{supervisorName(selectedEmployee.supervisorId)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Team</span>
                    <span className="text-sm text-[color:var(--text-primary)]">{selectedEmployee.teamId ?? "Unassigned"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Email</span>
                    <span className="text-sm text-[color:var(--text-primary)]">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Start date</span>
                    <span className="text-sm text-[color:var(--text-primary)]">{formatDate(selectedEmployee.startDate)}</span>
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
