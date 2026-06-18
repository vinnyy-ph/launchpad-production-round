"use client";

import { useMemo } from "react";
import { GitBranch } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import {
  useOffboardings,
  useSupervisorOnboardingStatus,
} from "@/modules/people/offboarding";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatCard, DataTable, type Column, EmptyState, StatusBadge } from "@/shared/ui/patterns";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TransitionRow {
  key: string;
  name: string;
  jobTitle: string;
  stage: "ONBOARDING" | "OFFBOARDING";
  detail: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HierarchyStatusPage() {
  const { appUser } = useAuth();
  const enabled = Boolean(appUser?.employeeId);

  const onboarding = useSupervisorOnboardingStatus(enabled);
  const offboarding = useOffboardings(enabled);

  const loading = onboarding.loading || offboarding.loading;
  const error = onboarding.error ?? offboarding.error;

  const rows = useMemo<TransitionRow[]>(() => {
    const out: TransitionRow[] = [];

    // Onboarding side — only those still in progress.
    for (const e of onboarding.employees) {
      if (e.status !== "onboarding") continue;
      const ob = e.onboarding;
      out.push({
        key: `on-${e.employeeId}`,
        name: `${e.firstName} ${e.lastName}`.trim(),
        jobTitle: e.jobTitle ?? "—",
        stage: "ONBOARDING",
        detail: `Docs ${ob.documentsSubmitted}/${ob.documentsRequired} · Fields ${ob.customFieldsFilled}/${ob.customFieldsRequired}`,
      });
    }

    // Offboarding side — only cases still in progress.
    for (const c of offboarding.offboardings) {
      if (c.status !== "IN_PROGRESS") continue;
      out.push({
        key: `off-${c.id}`,
        name: `${c.employee.firstName} ${c.employee.lastName}`.trim(),
        jobTitle: c.employee.jobTitle ?? "—",
        stage: "OFFBOARDING",
        detail: `Last day ${formatDate(c.effectiveDate)} · ${c.signedCount}/${c.totalCount} cleared`,
      });
    }

    return out;
  }, [onboarding.employees, offboarding.offboardings]);

  const onboardingCount = rows.filter((r) => r.stage === "ONBOARDING").length;
  const offboardingCount = rows.filter((r) => r.stage === "OFFBOARDING").length;

  function reload() {
    void onboarding.reload();
    void offboarding.reload();
  }

  const columns: Column<TransitionRow>[] = [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
            aria-hidden="true"
          >
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{row.name}</p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">{row.jobTitle}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Stage",
      cell: (row) => <StatusBadge status={row.stage} dot />,
    },
    {
      header: "Progress",
      cell: (row) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{row.detail}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        level="page"
        title="Hierarchy status"
        subtitle="Onboarding and offboarding across your reporting line."
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="In onboarding"
          value={loading ? "—" : onboardingCount}
          variant={onboardingCount > 0 ? "warn" : "default"}
        />
        <StatCard
          label="In offboarding"
          value={loading ? "—" : offboardingCount}
          variant={offboardingCount > 0 ? "alert" : "default"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          People in transition
        </h2>
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <DataTable
            columns={columns}
            data={error ? [] : rows}
            isLoading={loading}
            error={error}
            onRetry={reload}
            getRowId={(row) => row.key}
            emptyState={
              <EmptyState
                icon={GitBranch}
                title="No one in transition"
                body="When anyone in your reporting line is onboarding or offboarding, they'll show here."
              />
            }
          />
        </div>
      </section>
    </div>
  );
}
