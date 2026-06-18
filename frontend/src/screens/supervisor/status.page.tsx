import { useState, useEffect, useCallback } from "react";
import { GitBranch } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection } from "@/shared/mock/db";
import type { DemoEmployee, OnboardingCase, OffboardingCase } from "@/shared/mock/types";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatCard, DataTable, type Column, EmptyState, StatusBadge } from "@/shared/ui/patterns";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TransitionRow {
  employeeId: string;
  name: string;
  email: string;
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

/** Everyone below me in the reporting line (cycle-guarded). */
function subtreeOf(rootId: string, all: DemoEmployee[]): DemoEmployee[] {
  const byManager = new Map<string, DemoEmployee[]>();
  for (const e of all) {
    if (!e.supervisorId) continue;
    const list = byManager.get(e.supervisorId) ?? [];
    list.push(e);
    byManager.set(e.supervisorId, list);
  }
  const out: DemoEmployee[] = [];
  const seen = new Set<string>([rootId]);
  const stack = [...(byManager.get(rootId) ?? [])];
  while (stack.length) {
    const e = stack.pop()!;
    if (seen.has(e.employeeId)) continue;
    seen.add(e.employeeId);
    out.push(e);
    stack.push(...(byManager.get(e.employeeId) ?? []));
  }
  return out;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

function useHierarchyStatus(supervisorId: string | undefined) {
  const [rows, setRows] = useState<TransitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      if (!supervisorId) {
        setRows([]);
        return;
      }
      const all = readCollection<DemoEmployee>("employees");
      const onboarding = readCollection<OnboardingCase>("onboardingCases");
      const offboarding = readCollection<OffboardingCase>("offboardingCases");
      const subtree = subtreeOf(supervisorId, all);

      const result: TransitionRow[] = [];
      for (const e of subtree) {
        if (e.employeeStatus === "ONBOARDING") {
          const c = onboarding.find((o) => o.employeeId === e.employeeId);
          result.push({
            employeeId: e.employeeId,
            name: e.displayName,
            email: e.email,
            jobTitle: e.jobTitle,
            stage: "ONBOARDING",
            detail: c ? `${c.progress}% complete` : "In progress",
          });
        } else if (e.employeeStatus === "OFFBOARDING") {
          const c = offboarding.find((o) => o.employeeId === e.employeeId);
          result.push({
            employeeId: e.employeeId,
            name: e.displayName,
            email: e.email,
            jobTitle: e.jobTitle,
            stage: "OFFBOARDING",
            detail: c ? `Last day ${formatDate(c.lastDay)}` : "In progress",
          });
        }
      }
      setRows(result);
    } catch {
      setError("Couldn't load hierarchy status. Try again.");
    } finally {
      setLoading(false);
    }
  }, [supervisorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HierarchyStatusPage() {
  const { appUser } = useAuth();
  const { rows, loading, error, reload } = useHierarchyStatus(appUser?.employeeId);

  const onboardingCount = rows.filter((r) => r.stage === "ONBOARDING").length;
  const offboardingCount = rows.filter((r) => r.stage === "OFFBOARDING").length;

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
      cell: (row) => (
        <StatusBadge status={row.stage === "ONBOARDING" ? "ONBOARDING" : "OFFBOARDING"} dot />
      ),
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
            getRowId={(row) => row.employeeId}
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
