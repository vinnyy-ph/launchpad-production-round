"use client";

import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  ClipboardList,
  ClipboardCheck,
  Users,
  Send,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Star,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useEvaluations, useMyDirectReports } from "@/modules/performance/evaluations";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import { KpiCard, EmptyState } from "@/shared/ui/patterns";
import { DonutChart, LineChart, Skeleton } from "@/shared/ui";
import { CHART_COLORS } from "@/shared/ui/charts/palette";
import {
  summarizeEvaluations,
  computeCoverage,
  notEvaluatedCount,
  buildAttentionItems,
  averageGrade,
  gradeTrend,
  gradeDelta,
  acknowledgedRate,
  buildReportSnapshots,
  type AttentionItem,
  type EvalSummary,
  type TrendPoint,
} from "./overview.logic";
import { ReportSnapshot } from "./components/report-snapshot";
import { PulseResultCards } from "./components/pulse-result-cards";

// ─── Needs-your-attention band ──────────────────────────────────────────────

function AttentionBand({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div
        className="h-[112px] rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <span
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--color-success-50)" }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--color-success-600)" }} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">You&apos;re all caught up</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Nothing needs your attention right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-center gap-2 border-b border-[color:var(--border-secondary)] px-5 py-3">
        <AlertCircle size={15} style={{ color: "var(--color-warning-600)" }} />
        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Needs your attention
        </p>
      </div>
      <div className="divide-y divide-[color:var(--border-secondary)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
          >
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[color:var(--bg-tertiary)] px-1.5 text-xs font-bold tabular-nums text-[color:var(--text-secondary)]">
              {item.count}
            </span>
            <span className="flex-1 text-sm text-[color:var(--text-primary)]">{item.label}</span>
            <ArrowUpRight
              size={15}
              className="flex-shrink-0 text-[color:var(--text-quaternary)] opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Team composition KPI card (clickable → roster) ─────────────────────────

function TeamCard({
  total,
  active,
  onboarding,
  offboarding,
  loading,
}: {
  total: number;
  active: number;
  onboarding: number;
  offboarding: number;
  loading: boolean;
}) {
  const breakdown = [
    { label: "Active", count: active, color: "var(--color-success-600)" },
    { label: "Onboarding", count: onboarding, color: "var(--color-warning-600)" },
    { label: "Offboarding", count: offboarding, color: "var(--color-error-600)" },
  ];
  return (
    <Link
      href="/supervisor/roster"
      className="group relative block overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-[18px] transition-colors hover:border-[color:var(--border-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <ArrowUpRight
        aria-hidden="true"
        className="absolute right-4 top-4 h-4 w-4 text-[color:var(--text-quaternary)] opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-center gap-2">
        <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[5px] bg-[color:var(--gray-100)]">
          <Users size={12} className="text-[color:var(--text-secondary)]" />
        </span>
        <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-[color:var(--text-primary)]">
          Team
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3.5 h-10 w-16" />
      ) : (
        <p className="mt-3.5 text-[40px] font-bold leading-none tracking-[-0.025em] text-[color:var(--text-primary)]">
          {total}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {breakdown.map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--text-tertiary)]"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} aria-hidden="true" />
            <span className="font-semibold tabular-nums text-[color:var(--text-secondary)]">{b.count}</span>{" "}
            {b.label}
          </span>
        ))}
      </div>
    </Link>
  );
}

// ─── Grade distribution (labeled horizontal bars — reads cleanly at small n) ──

function GradeDistribution({ data }: { data: EvalSummary["gradeDistribution"] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.grade} className="flex items-center gap-3">
          <span className="w-[116px] flex-none text-xs text-[color:var(--text-secondary)]">{d.label}</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--bg-tertiary)]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(d.count / max) * 100}%`, background: "hsl(var(--chart-1))" }}
            />
          </div>
          <span className="w-5 flex-none text-right text-xs font-semibold tabular-nums text-[color:var(--text-primary)]">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Evaluation breakdown (ack donut + grade bars) ───────────────────────────

function EvaluationBreakdown({
  summary,
  isLoading,
  isError,
  refetch,
}: {
  summary: EvalSummary;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[260px] rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-xs)" }}
          />
        ))}
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
          onClick={refetch}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  if (summary.sent === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No evaluations sent yet"
        body="Once you send an evaluation to a direct report, its grade and acknowledgement breakdown appear here."
      />
    );
  }

  const ackBreakdown = [
    { name: "Acknowledged", value: summary.acknowledged },
    { name: "Auto-acknowledged", value: summary.autoAcknowledged },
    { name: "Pending acknowledgement", value: summary.pending },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">Acknowledgement status</p>
        <DonutChart data={ackBreakdown} height={200} />
        <div className="mt-3 flex flex-col gap-1.5">
          {ackBreakdown.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="flex-1 text-[color:var(--text-secondary)]">{d.name}</span>
              <span className="font-semibold tabular-nums text-[color:var(--text-primary)]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">Grade distribution</p>
        <GradeDistribution data={summary.gradeDistribution} />
      </div>
    </div>
  );
}

// ─── Performance trend (avg grade per month) ─────────────────────────────────

function PerformanceTrend({ trend, loading }: { trend: TrendPoint[]; loading: boolean }) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={15} className="text-[color:var(--text-secondary)]" />
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Performance trend</p>
      </div>
      {loading ? (
        <Skeleton className="h-[200px] w-full rounded-lg" />
      ) : trend.length < 2 ? (
        <div className="flex h-[200px] items-center justify-center text-center">
          <p className="max-w-[280px] text-sm text-[color:var(--text-tertiary)]">
            A trend appears once you&apos;ve sent evaluations across two or more months.
          </p>
        </div>
      ) : (
        <LineChart data={trend} categoryKey="period" valueKey="avg" height={200} />
      )}
    </div>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || undefined;

  // Supervisors are EMPLOYEE-role callers, so the API returns the REDACTED list (no PII).
  // The server-side `supervisorId` filter scopes it to this supervisor's direct reports.
  const { employees, loading: reportsLoading } = useEmployees({
    supervisorIds: employeeId ? [employeeId] : undefined,
    page: 1,
    limit: 100,
  });
  const reports = employeeId ? employees : [];

  const {
    data: evals,
    isLoading: evalsLoading,
    isError: evalsError,
    refetch: refetchEvals,
  } = useEvaluations();
  const { data: reviewees, isLoading: revieweesLoading } = useMyDirectReports();

  const composition = {
    total: reports.length,
    active: reports.filter((r) => r.status === "active").length,
    onboarding: reports.filter((r) => r.status === "onboarding").length,
    offboarding: reports.filter((r) => r.status === "offboarding").length,
  };

  const summary = summarizeEvaluations(evals ?? [], employeeId);
  const coverage = computeCoverage(reviewees ?? [], evals ?? [], employeeId);
  const notEvaluated = notEvaluatedCount(reviewees ?? [], evals ?? [], employeeId);
  const attentionItems = buildAttentionItems({
    drafts: summary.drafts,
    pending: summary.pending,
    notEvaluated,
  });

  const analyticsLoading = evalsLoading || revieweesLoading;

  const avgGrade = averageGrade(evals ?? [], employeeId);
  const trend = gradeTrend(evals ?? [], employeeId);
  const avgDelta = gradeDelta(trend) ?? undefined;
  const ackRate = acknowledgedRate(summary);
  const snapshots = buildReportSnapshots(reviewees ?? [], evals ?? [], employeeId);

  return (
    <div className="min-w-0 space-y-6">
      <ScreenHeader id="overview" level="page" />

      {/* What needs the supervisor's attention now */}
      <AttentionBand items={attentionItems} loading={analyticsLoading || reportsLoading} />

      {/* At a glance — clickable headline KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <TeamCard
          total={composition.total}
          active={composition.active}
          onboarding={composition.onboarding}
          offboarding={composition.offboarding}
          loading={reportsLoading}
        />
        <KpiCard
          label="Avg. grade"
          value={avgGrade != null ? `${avgGrade.toFixed(1)} / 5` : "—"}
          icon={Star}
          delta={avgDelta}
          hint="Mean overall rating across the evaluations you've sent. The pill compares the latest month to the one before."
          loading={analyticsLoading}
          href="/supervisor/evaluations?status=sent"
        />
        <KpiCard
          label="Coverage"
          value={`${coverage.evaluated}/${coverage.total}`}
          icon={ClipboardCheck}
          period="team members evaluated"
          hint="How many of your direct reports have at least one sent evaluation."
          loading={analyticsLoading}
          href="/supervisor/evaluations"
        />
        <KpiCard
          label="Evaluations sent"
          value={summary.sent}
          icon={Send}
          hint="Evaluations you have sent to your direct reports. Sent evaluations are final and read-only."
          loading={analyticsLoading}
          href="/supervisor/evaluations?status=sent"
        />
        <KpiCard
          label="Acknowledgement rate"
          value={ackRate != null ? `${ackRate}%` : "—"}
          icon={CheckCircle2}
          hint="Share of your sent evaluations a report has explicitly acknowledged. Auto-acknowledged evaluations are not counted."
          loading={analyticsLoading}
          href="/supervisor/evaluations?status=sent"
        />
      </div>

      {/* The people behind the numbers — latest performance state per direct report */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Team performance
        </h2>
        <ReportSnapshot snapshots={snapshots} loading={analyticsLoading || reportsLoading} />
      </section>

      {/* Evaluation analytics */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Evaluation breakdown
        </h2>
        <PerformanceTrend trend={trend} loading={analyticsLoading} />
        <EvaluationBreakdown
          summary={summary}
          isLoading={analyticsLoading}
          isError={evalsError}
          refetch={() => void refetchEvals()}
        />
      </section>

      {/* Pulse results the supervisor may view — enriched with participation + sentiment */}
      <PulseResultCards />
    </div>
  );
}
