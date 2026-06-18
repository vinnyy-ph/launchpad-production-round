"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import { BarChart, DonutChart } from "@/shared/ui";
import { useEvaluations } from "@/modules/performance/evaluations/hooks/use-evaluations";
import type { Evaluation as PerfEvaluation } from "@/modules/performance/evaluations/types/evaluations.types";
import { useSurveys } from "@/modules/performance/surveys/hooks/use-surveys";
import { SurveyResults } from "@/modules/performance/surveys/components/survey-results";
import {
  STATUS_LABEL,
  deriveStatus,
  type SurveyListItem,
  type SurveyStatus,
} from "@/modules/performance/surveys/types/surveys.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Derive an evaluation's lifecycle status from the real API fields. */
type EvalStatus = "DRAFT" | "SHARED" | "ACKNOWLEDGED" | "DEEMED_ACKNOWLEDGED";
function evalStatus(ev: PerfEvaluation): EvalStatus {
  if (!ev.isSent) return "DRAFT";
  if (ev.acknowledgement?.acknowledgedAt) return "ACKNOWLEDGED";
  if (ev.acknowledgement?.isDeemedAck) return "DEEMED_ACKNOWLEDGED";
  return "SHARED";
}

/**
 * Build grade distribution (1-5) for shared+acknowledged evaluations.
 */
function buildGradeDistribution(
  evals: PerfEvaluation[],
): { label: string; count: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const ev of evals) {
    if (ev.grade !== undefined && ev.grade >= 1 && ev.grade <= 5) {
      counts[ev.grade] = (counts[ev.grade] ?? 0) + 1;
    }
  }
  return Object.entries(counts).map(([k, v]) => ({ label: `Grade ${k}`, count: v }));
}

// ─── Stat strip ───────────────────────────────────────────────────────────────

function StatStrip({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p className="text-xs text-[color:var(--text-tertiary)]">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-[color:var(--text-primary)]">{value}</p>
    </div>
  );
}

// ─── Evaluations summary panel ────────────────────────────────────────────────

function EvaluationsSummaryPanel({
  evals,
  loading,
  error,
  onReload,
}: {
  evals: PerfEvaluation[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
        <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
        <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
        <button
          onClick={onReload}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const withStatus = evals.map((ev) => ({ ev, status: evalStatus(ev) }));
  const sharedEvals = withStatus.filter((s) => s.status !== "DRAFT").map((s) => s.ev);

  if (sharedEvals.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No shared evaluations"
        body="Evaluations will appear here once supervisors share them."
      />
    );
  }

  const acknowledgedCount = withStatus.filter((s) => s.status === "ACKNOWLEDGED").length;
  const deemedAckCount = withStatus.filter((s) => s.status === "DEEMED_ACKNOWLEDGED").length;
  const pendingCount = withStatus.filter((s) => s.status === "SHARED").length;
  const draftCount = withStatus.filter((s) => s.status === "DRAFT").length;

  const gradeDistribution = buildGradeDistribution(sharedEvals);
  const hasGrades = gradeDistribution.some((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        <StatStrip label="Total evaluations" value={evals.length} />
        <StatStrip label="Acknowledged" value={acknowledgedCount} />
        <StatStrip label="Deemed acknowledged" value={deemedAckCount} />
        <StatStrip label="Pending acknowledgement" value={pendingCount} />
        <StatStrip label="Drafts" value={draftCount} />
      </div>

      {/* Grade distribution — primary chart */}
      {hasGrades && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
            Grade distribution (shared &amp; acknowledged evaluations)
          </p>
          <BarChart
            data={gradeDistribution}
            categoryKey="label"
            valueKey="count"
            height={220}
          />
        </div>
      )}

      {/* Status breakdown donut — includes DEEMED_ACKNOWLEDGED */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
          Evaluation status breakdown
        </p>
        <DonutChart
          data={[
            { name: "Draft", value: draftCount },
            { name: "Shared", value: pendingCount },
            { name: "Acknowledged", value: acknowledgedCount },
            { name: "Deemed ack.", value: deemedAckCount },
          ].filter((d) => d.value > 0)}
          height={220}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<SurveyStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  draft: "neutral",
  closed: "warning",
};

export default function PerformanceHubPage() {
  const surveysQuery = useSurveys();
  const surveys = surveysQuery.data ?? [];
  const {
    data: evalData,
    isLoading: evalLoading,
    isError: evalError,
    refetch: refetchEvals,
  } = useEvaluations();

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");

  // Pick the first live survey by default, falling back to any survey.
  useEffect(() => {
    if (surveys.length > 0 && !selectedSurveyId) {
      const live = surveys.find((s) => s.isActive);
      setSelectedSurveyId(live?.id ?? surveys[0].id);
    }
  }, [surveys, selectedSurveyId]);

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId) ?? null;

  return (
    <div>
      <ScreenHeader id="performance" />

      <Tabs defaultValue="survey">
        <TabsList>
          <TabsTrigger value="survey">Survey results</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        </TabsList>

        {/* ── Survey results tab ── */}
        <TabsContent value="survey" className="mt-5">
          {surveysQuery.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-[color:var(--border-primary)] bg-white"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : surveysQuery.isError ? (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
              <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
                {surveysQuery.error.message}
              </span>
              <button
                onClick={() => void surveysQuery.refetch()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : surveys.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No surveys yet"
              body="Create and activate a pulse survey to see results here."
            />
          ) : (
            <div className="space-y-5">
              {/* Survey selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-[color:var(--text-primary)]">Survey</label>
                <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                  <SelectTrigger className="w-auto min-w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map((s: SurveyListItem) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                        <span className="ml-2 text-[10px] uppercase text-[color:var(--text-quaternary)]">
                          {STATUS_LABEL[deriveStatus(s)]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSurvey && (
                  <Badge variant={STATUS_VARIANT[deriveStatus(selectedSurvey)]}>
                    {STATUS_LABEL[deriveStatus(selectedSurvey)]}
                  </Badge>
                )}
              </div>

              {selectedSurvey ? (
                <SurveyResults surveyId={selectedSurvey.id} />
              ) : (
                <EmptyState icon={TrendingUp} title="Select a survey" body="Choose a survey above to view results." />
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Evaluations tab ── */}
        <TabsContent value="evaluations" className="mt-5">
          <EvaluationsSummaryPanel
            evals={evalData ?? []}
            loading={evalLoading}
            error={evalError ? "Could not load evaluations." : null}
            onReload={() => void refetchEvals()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
