import { AlertCircle, RefreshCw, ClipboardList } from "lucide-react";
import { VisibleResultsList } from "@/modules/performance/surveys/components/visible-results-list";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import {
  useEvaluations,
  GRADE_LABELS,
  type Evaluation,
} from "@/modules/performance/evaluations";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import { StatCard, EmptyState } from "@/shared/ui/patterns";
import { BarChart, DonutChart } from "@/shared/ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Acknowledgement status for a SENT evaluation. */
type AckStatus = "ACKNOWLEDGED" | "DEEMED_ACKNOWLEDGED" | "PENDING";
function ackStatus(ev: Evaluation): AckStatus {
  if (ev.acknowledgement?.acknowledgedAt) return "ACKNOWLEDGED";
  if (ev.acknowledgement?.isDeemedAck) return "DEEMED_ACKNOWLEDGED";
  return "PENDING";
}

/** Count of SENT evals per grade (1–5), labelled via GRADE_LABELS. */
function buildGradeDistribution(evals: Evaluation[]): { label: string; count: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const ev of evals) {
    if (ev.grade >= 1 && ev.grade <= 5) counts[ev.grade] = (counts[ev.grade] ?? 0) + 1;
  }
  return [1, 2, 3, 4, 5].map((g) => ({ label: GRADE_LABELS[g] ?? `Grade ${g}`, count: counts[g] ?? 0 }));
}

// ─── Team performance analytics ───────────────────────────────────────────────

function TeamPerformancePanel({
  appUserEmployeeId,
}: {
  appUserEmployeeId: string | undefined;
}) {
  const { data, isLoading, isError, refetch } = useEvaluations();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[68px] rounded-xl border border-[color:var(--border-primary)] bg-white"
              style={{ boxShadow: "var(--shadow-xs)" }}
            />
          ))}
        </div>
        <div
          className="h-[260px] rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
        <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
        <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
          Could not load your evaluations.
        </span>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  // Only evaluations THIS supervisor issued.
  const mine = appUserEmployeeId
    ? (data ?? []).filter((ev) => ev.reviewerId === appUserEmployeeId)
    : [];
  const sent = mine.filter((ev) => ev.isSent);
  const drafts = mine.filter((ev) => !ev.isSent);

  if (mine.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No evaluations issued yet"
        body="Evaluations you write for your direct reports will be summarised here."
      />
    );
  }

  const acknowledged = sent.filter((ev) => ackStatus(ev) === "ACKNOWLEDGED").length;
  const deemedAck = sent.filter((ev) => ackStatus(ev) === "DEEMED_ACKNOWLEDGED").length;
  const pending = sent.filter((ev) => ackStatus(ev) === "PENDING").length;

  const gradeDistribution = buildGradeDistribution(sent);
  const hasGrades = gradeDistribution.some((d) => d.count > 0);

  const ackBreakdown = [
    { name: "Pending", value: pending },
    { name: "Acknowledged", value: acknowledged },
    { name: "Deemed acknowledged", value: deemedAck },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Issued" value={sent.length} variant="brand" />
        <StatCard label="Drafts" value={drafts.length} variant={drafts.length > 0 ? "warn" : "default"} />
        <StatCard
          label="Pending ack"
          value={pending}
          variant={pending > 0 ? "alert" : "default"}
          hint="Sent evaluations the employee hasn't acknowledged yet — the acknowledgement deadline hasn't passed."
        />
        <StatCard
          label="Acknowledged"
          value={acknowledged}
          hint="The employee explicitly acknowledged receiving the evaluation."
        />
        <StatCard
          label="Deemed ack"
          value={deemedAck}
          hint="The acknowledgement deadline passed without a response, so the system auto-marks it acknowledged for compliance."
        />
      </div>

      {/* Clear next action */}
      {pending > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-[color:var(--text-secondary)]">
          <AlertCircle size={14} className="flex-shrink-0 text-[color:var(--color-warning-600)]" />
          {pending} {pending === 1 ? "evaluation is" : "evaluations are"} awaiting acknowledgement.
        </p>
      )}

      {/* Charts — stack on narrow screens, side-by-side on wide */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {hasGrades && (
          <div
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
              Grade distribution
            </p>
            <BarChart data={gradeDistribution} categoryKey="label" valueKey="count" height={220} />
          </div>
        )}

        {ackBreakdown.length > 0 && (
          <div
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
              Acknowledgement status
            </p>
            <DonutChart data={ackBreakdown} height={220} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || undefined;

  // Supervisors are EMPLOYEE-role callers, so the API returns the REDACTED list (no PII).
  // The server-side `supervisorId` filter scopes it to this supervisor's direct reports.
  const { employees, loading } = useEmployees({
    supervisorIds: employeeId ? [employeeId] : undefined,
    page: 1,
    limit: 100,
  });
  const reports = employeeId ? employees : [];

  const stats = {
    total: reports.length,
    active: reports.filter((r) => r.status === "active").length,
    onboarding: reports.filter((r) => r.status === "onboarding").length,
    offboarding: reports.filter((r) => r.status === "offboarding").length,
  };

  return (
    <div className="min-w-0">
      <ScreenHeader id="overview" level="page" />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Headcount" value={stats.total} loading={loading} variant="brand" />
        <StatCard label="Active" value={stats.active} loading={loading} />
        <StatCard
          label="Onboarding"
          value={stats.onboarding}
          loading={loading}
          variant={stats.onboarding > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Offboarding"
          value={stats.offboarding}
          loading={loading}
          variant={stats.offboarding > 0 ? "alert" : "default"}
        />
      </div>

      {/* Team performance — analytics for evaluations THIS supervisor has issued */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team performance
        </h2>
        <TeamPerformancePanel appUserEmployeeId={employeeId} />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Pulse results
        </h2>
        <VisibleResultsList />
      </section>
    </div>
  );
}
