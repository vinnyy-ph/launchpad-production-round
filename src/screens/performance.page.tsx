"use client";

import { useState, useCallback, useEffect } from "react";
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
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
import { BarChart, DonutChart, LineChart } from "@/shared/ui";
import { readCollection } from "@/shared/mock/db";
import type {
  Survey,
  SurveyResponse,
  SurveyQuestion,
  Evaluation,
  DemoEmployee,
} from "@/shared/mock/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Aggregate rating answers for a given question across all responses.
 * Returns data for a BarChart (count per rating 1–5).
 */
function aggregateRating(
  responses: SurveyResponse[],
  qid: string,
): { label: string; count: number }[] {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of responses) {
    const val = r.answers[qid];
    if (typeof val === "number" && val >= 1 && val <= 5) {
      counts[val] = (counts[val] ?? 0) + 1;
    }
  }
  return Object.entries(counts).map(([k, v]) => ({ label: `${k} ★`, count: v }));
}

/**
 * Aggregate single-choice answers for a given question.
 * Returns data for a DonutChart.
 */
function aggregateSingle(
  responses: SurveyResponse[],
  qid: string,
  options: string[],
): { name: string; value: number }[] {
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]));
  for (const r of responses) {
    const val = r.answers[qid];
    if (typeof val === "string" && val in counts) {
      counts[val]++;
    }
  }
  return options.map((o) => ({ name: o, value: counts[o] }));
}

/**
 * Build a trend line from responses over time (grouped by submission date).
 * Uses the average rating across all RATING questions per day.
 */
function buildTrend(
  responses: SurveyResponse[],
  ratingQIds: string[],
): { date: string; avg: number }[] {
  if (ratingQIds.length === 0 || responses.length === 0) return [];
  const byDay: Record<string, number[]> = {};
  for (const r of responses) {
    const day = r.submittedAt.slice(0, 10);
    const vals = ratingQIds
      .map((qid) => r.answers[qid])
      .filter((v): v is number => typeof v === "number");
    if (vals.length > 0) {
      byDay[day] = [...(byDay[day] ?? []), ...vals];
    }
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    }));
}

/**
 * Build evaluation competency averages for the BarChart.
 */
function buildCompetencyAverages(
  evals: Evaluation[],
): { competency: string; avg: number }[] {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const ev of evals) {
    for (const r of ev.ratings) {
      if (!totals[r.competency]) totals[r.competency] = { sum: 0, count: 0 };
      totals[r.competency].sum += r.score;
      totals[r.competency].count++;
    }
  }
  return Object.entries(totals).map(([competency, { sum, count }]) => ({
    competency,
    avg: Math.round((sum / count) * 10) / 10,
  }));
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePerformanceData() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      setSurveys(readCollection<Survey>("surveys"));
      setResponses(readCollection<SurveyResponse>("surveyResponses"));
      setEvals(readCollection<Evaluation>("evaluations"));
      setEmployees(readCollection<DemoEmployee>("employees"));
    } catch {
      setError("Could not load performance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { surveys, responses, evals, employees, loading, error, reload: load };
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

// ─── Anonymity guard notice ───────────────────────────────────────────────────

function AnonymityGuard({ minGroupSize, count }: { minGroupSize: number; count: number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Results hidden</p>
        <p className="text-xs text-amber-700">
          {count} response{count !== 1 ? "s" : ""} received — results are only shown once{" "}
          {minGroupSize} or more responses have been collected.
        </p>
      </div>
    </div>
  );
}

// ─── Survey results panel ─────────────────────────────────────────────────────

function SurveyResultsPanel({
  survey,
  responses,
}: {
  survey: Survey;
  responses: SurveyResponse[];
}) {
  const surveyResponses = responses.filter((r) => r.surveyId === survey.id);
  const responseCount = surveyResponses.length;
  const meetsMinGroup = responseCount >= survey.minGroupSize;
  const ratingQIds = survey.questions.filter((q) => q.type === "RATING").map((q) => q.id);
  const trendData = meetsMinGroup ? buildTrend(surveyResponses, ratingQIds) : [];

  return (
    <div className="space-y-6">
      {/* Response count */}
      <div className="flex flex-wrap gap-3">
        <StatStrip label="Responses" value={responseCount} />
        <StatStrip label="Min group size" value={survey.minGroupSize} />
        <StatStrip label="Anonymity" value={survey.anonymous ? "On" : "Off"} />
        <StatStrip label="Audience" value={survey.audience} />
      </div>

      {/* Anonymity guard */}
      {survey.anonymous && !meetsMinGroup && (
        <AnonymityGuard minGroupSize={survey.minGroupSize} count={responseCount} />
      )}

      {/* Per-question charts */}
      <div className="space-y-6">
        {survey.questions.map((q: SurveyQuestion, idx: number) => (
          <div
            key={q.id}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Q{idx + 1} · {q.type}
            </p>
            <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">{q.prompt}</p>

            {q.type === "RATING" && (
              <BarChart
                data={aggregateRating(surveyResponses, q.id).map((d) => ({ label: d.label, count: d.count }))}
                categoryKey="label"
                valueKey="count"
                height={200}
                minGroupSize={survey.anonymous ? survey.minGroupSize : undefined}
              />
            )}

            {q.type === "SINGLE" && (
              <DonutChart
                data={aggregateSingle(surveyResponses, q.id, q.options ?? [])}
                height={200}
                minGroupSize={survey.anonymous ? survey.minGroupSize : undefined}
              />
            )}

            {q.type === "MULTI" && (
              <BarChart
                data={(q.options ?? []).map((opt) => ({
                  option: opt,
                  count: surveyResponses.filter((r) => {
                    const ans = r.answers[q.id];
                    return Array.isArray(ans) && ans.includes(opt);
                  }).length,
                }))}
                categoryKey="option"
                valueKey="count"
                height={200}
                minGroupSize={survey.anonymous ? survey.minGroupSize : undefined}
              />
            )}

            {q.type === "TEXT" && (
              survey.anonymous || !meetsMinGroup ? (
                survey.anonymous && !meetsMinGroup ? (
                  <AnonymityGuard minGroupSize={survey.minGroupSize} count={responseCount} />
                ) : (
                  <div className="space-y-2">
                    {surveyResponses
                      .filter((r) => r.answers[q.id] && String(r.answers[q.id]).trim())
                      .map((r, i) => (
                        <div
                          key={r.id}
                          className="rounded-lg bg-[color:var(--bg-secondary)] px-4 py-2.5"
                        >
                          {/* Never reveal respondent identity for anonymous surveys */}
                          <p className="text-xs text-[color:var(--text-quaternary)]">Response {i + 1}</p>
                          <p className="mt-0.5 text-sm text-[color:var(--text-primary)]">
                            {String(r.answers[q.id])}
                          </p>
                        </div>
                      ))}
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  {surveyResponses
                    .filter((r) => r.answers[q.id] && String(r.answers[q.id]).trim())
                    .map((r) => (
                      <div
                        key={r.id}
                        className="rounded-lg bg-[color:var(--bg-secondary)] px-4 py-2.5"
                      >
                        {/* Named survey — can show employee name */}
                        <p className="text-xs text-[color:var(--text-quaternary)]">{r.employeeId}</p>
                        <p className="mt-0.5 text-sm text-[color:var(--text-primary)]">
                          {String(r.answers[q.id])}
                        </p>
                      </div>
                    ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {ratingQIds.length > 0 && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
            Average rating trend over time
          </p>
          {meetsMinGroup && trendData.length >= 2 ? (
            <LineChart
              data={trendData}
              categoryKey="date"
              valueKey="avg"
              height={220}
              minGroupSize={survey.anonymous ? survey.minGroupSize : undefined}
            />
          ) : (
            <p className="text-sm text-[color:var(--text-tertiary)]">
              {!meetsMinGroup
                ? `Not enough responses yet (need ${survey.minGroupSize}).`
                : "Need at least 2 days of data to show a trend."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Evaluations summary panel ────────────────────────────────────────────────

function EvaluationsSummaryPanel({ evals }: { evals: Evaluation[] }) {
  const sharedEvals = evals.filter((e) => e.status === "SHARED" || e.status === "ACKNOWLEDGED");
  const competencyData = buildCompetencyAverages(sharedEvals);

  if (sharedEvals.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No shared evaluations"
        body="Evaluations will appear here once supervisors share them."
      />
    );
  }

  const acknowledgedCount = evals.filter((e) => e.status === "ACKNOWLEDGED").length;
  const pendingCount = evals.filter((e) => e.status === "SHARED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <StatStrip label="Total evaluations" value={evals.length} />
        <StatStrip label="Acknowledged" value={acknowledgedCount} />
        <StatStrip label="Pending acknowledgement" value={pendingCount} />
      </div>

      {competencyData.length > 0 && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
            Average competency scores (shared &amp; acknowledged evaluations)
          </p>
          <BarChart
            data={competencyData}
            categoryKey="competency"
            valueKey="avg"
            height={220}
          />
        </div>
      )}

      {/* Status breakdown donut */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <p className="mb-4 text-sm font-semibold text-[color:var(--text-primary)]">
          Evaluation status breakdown
        </p>
        <DonutChart
          data={[
            { name: "Draft", value: evals.filter((e) => e.status === "DRAFT").length },
            { name: "Shared", value: evals.filter((e) => e.status === "SHARED").length },
            { name: "Acknowledged", value: evals.filter((e) => e.status === "ACKNOWLEDGED").length },
          ].filter((d) => d.value > 0)}
          height={220}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PerformanceHubPage() {
  const { surveys, responses, evals, loading, error, reload } = usePerformanceData();

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");

  // Pick the first ACTIVE survey by default
  useEffect(() => {
    if (surveys.length > 0 && !selectedSurveyId) {
      const active = surveys.find((s) => s.status === "ACTIVE");
      setSelectedSurveyId(active?.id ?? surveys[0].id);
    }
  }, [surveys, selectedSurveyId]);

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId) ?? null;

  if (loading) {
    return (
      <div>
        <PageHeader level="page" title="Performance" subtitle="Results and insights across the organisation." />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader level="page" title="Performance" subtitle="Results and insights across the organisation." />
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <button
            onClick={() => void reload()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        level="page"
        title="Performance"
        subtitle="Pulse survey results and evaluation insights."
      />

      <Tabs defaultValue="survey">
        <TabsList>
          <TabsTrigger value="survey">Survey results</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        </TabsList>

        {/* ── Survey results tab ── */}
        <TabsContent value="survey" className="mt-5">
          {surveys.length === 0 ? (
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
                    {surveys.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                        <span className="ml-2 text-[10px] uppercase text-[color:var(--text-quaternary)]">
                          {s.status}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSurvey && (
                  <Badge
                    variant={
                      selectedSurvey.status === "ACTIVE"
                        ? "success"
                        : selectedSurvey.status === "DRAFT"
                        ? "neutral"
                        : "warning"
                    }
                  >
                    {selectedSurvey.status === "ACTIVE"
                      ? "Active"
                      : selectedSurvey.status === "DRAFT"
                      ? "Draft"
                      : "Closed"}
                  </Badge>
                )}
              </div>

              {selectedSurvey ? (
                <SurveyResultsPanel survey={selectedSurvey} responses={responses} />
              ) : (
                <EmptyState icon={TrendingUp} title="Select a survey" body="Choose a survey above to view results." />
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Evaluations tab ── */}
        <TabsContent value="evaluations" className="mt-5">
          <EvaluationsSummaryPanel evals={evals} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
