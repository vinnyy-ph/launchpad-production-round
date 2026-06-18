import { useState } from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import type { EmployeeListItem } from "@/modules/people/employees/types/employees.types";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import { StatCard, DataTable, type Column, EmptyState, StatusBadge } from "@/shared/ui/patterns";
import {
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || undefined;

  // Supervisors are EMPLOYEE-role callers, so the API returns the REDACTED list (no PII).
  // The server-side `supervisorId` filter scopes it to this supervisor's direct reports.
  const { employees, loading, error, reload } = useEmployees({
    supervisorId: employeeId,
    page: 1,
    limit: 100,
  });
  const reports = employeeId ? employees : [];

  const [selected, setSelected] = useState<EmployeeListItem | null>(null);

  const stats = {
    total: reports.length,
    active: reports.filter((r) => r.status === "active").length,
    onboarding: reports.filter((r) => r.status === "onboarding").length,
    offboarding: reports.filter((r) => r.status === "offboarding").length,
  };

  const columns: Column<EmployeeListItem>[] = [
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
      cell: (row) => <StatusBadge status={row.status} dot />,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ScreenHeader id="overview" />

      {/* Stat cards */}
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
            data={reports}
            isLoading={loading}
            error={error}
            onRetry={() => void reload()}
            getRowId={(row) => row.id}
            onRowClick={(row) => setSelected(row)}
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
