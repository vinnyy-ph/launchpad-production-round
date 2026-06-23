"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Download,
  Lock,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  BadgeDot,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useConfirm,
} from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { usePageBreadcrumb } from "@/shared/components/layout/breadcrumb-context";
import { useSurvey } from "../hooks/use-survey";
import { useSurveyResults } from "../hooks/use-survey-results";
import { useSurveyOccurrences } from "../hooks/use-survey-occurrences";
import { useShareResults } from "../hooks/use-share-results";
import type {
  QuestionResult,
  ResultsFilter,
  SmallTeamShare,
  SurveyDetail,
  SurveyResults as SurveyResultsType,
} from "../types/surveys.types";
import {
  AUDIENCE_TYPE_LABEL,
  RECURRING_TYPE_LABEL,
  STATUS_LABEL,
  deriveStatus,
} from "../types/surveys.types";
import { ResultsFilters } from "./results/results-filters";
import { RespondentsDrilldown } from "./results/respondents-drilldown";
import { AiInsightsPanel } from "./ai-insights-panel";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDay(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

// The team-supervisor block for small anonymous teams comes back as a dedicated 403 code
// (not a `suppressed` payload), so it's rendered as an informational notice, not an error.
function isSmallTeamSupervisorBlock(err: unknown): boolean {
  return err instanceof ApiError && err.errorCode === "RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR";
}

const QTYPE_LABEL: Record<QuestionResult["type"], string> = {
  SHORT_ANSWER: "Short answer",
  LONG_ANSWER: "Long answer",
  LINEAR_SCALE: "Linear scale",
  MULTIPLE_CHOICE: "Multiple choice",
  CHECKBOX: "Checkbox",
};

// CSV export — fully client-side, no backend round-trip.
function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildCsv(survey: SurveyDetail | undefined, results: SurveyResultsType): string {
  const rows: string[][] = [["Question", "Type", "Answer", "Count", "Percent"]];
  for (const q of results.questions) {
    if (q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") {
      if (results.isAnonymous || q.responses.length === 0) {
        rows.push([
          q.questionText,
          QTYPE_LABEL[q.type],
          results.isAnonymous ? "Free text hidden (anonymous)" : "No responses",
          String(q.responseCount),
          "",
        ]);
      } else {
        q.responses.forEach((t) => rows.push([q.questionText, QTYPE_LABEL[q.type], t, "", ""]));
      }
    } else if (q.type === "LINEAR_SCALE") {
      const total = Object.values(q.distribution).reduce((a, b) => a + b, 0);
      Object.entries(q.distribution)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .forEach(([val, count]) =>
          rows.push([q.questionText, QTYPE_LABEL[q.type], val, String(count), `${pct(count, total)}%`]),
        );
      rows.push([q.questionText, QTYPE_LABEL[q.type], "Average", q.average.toFixed(2), ""]);
    } else if (q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") {
      Object.entries(q.counts).forEach(([opt, count]) =>
        rows.push([
          q.questionText,
          QTYPE_LABEL[q.type],
          opt,
          String(count),
          `${pct(count, q.responseCount)}%`,
        ]),
      );
    }
  }
  const title = survey?.name ? `# ${survey.name} — results\r\n` : "";
  return title + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── presentational pieces ─────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)]">
      <div className="text-[30px] font-bold leading-none tracking-tight text-[color:var(--text-primary)]">
        {value}
      </div>
      <div className="mt-2.5 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
        {label}
      </div>
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  soft,
}: {
  label: string;
  count: number;
  total: number;
  soft?: boolean;
}) {
  const p = pct(count, total);
  return (
    <div className="mb-2.5 grid grid-cols-[96px_1fr_72px] items-center gap-3 last:mb-0 sm:grid-cols-[120px_1fr_84px]">
      <span className="truncate text-[13.5px] text-[color:var(--text-primary)]" title={label}>
        {label}
      </span>
      <span className="h-3 overflow-hidden rounded-full bg-[color:var(--bg-secondary)]">
        <span
          className={cn(
            "block h-full rounded-full",
            soft ? "bg-[color:var(--border-strong)]" : "bg-[color:var(--text-primary)]",
          )}
          style={{ width: `${p}%` }}
        />
      </span>
      <span className="whitespace-nowrap text-right text-[12.5px] text-[color:var(--text-tertiary)]">
        <b className="font-semibold text-[color:var(--text-primary)]">{count}</b> · {p}%
      </span>
    </div>
  );
}

function QuestionCard({
  q,
  isAnonymous,
}: {
  q: QuestionResult;
  isAnonymous: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)] sm:p-6">
      <div className="mb-4">
        <div className="text-[11.5px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
          {QTYPE_LABEL[q.type]}
        </div>
        <h3 className="mt-1 text-[16.5px] font-bold tracking-tight text-[color:var(--text-primary)]">
          {q.questionText}
        </h3>
        {q.type !== "SHORT_ANSWER" && q.type !== "LONG_ANSWER" && (
          <div className="mt-1 text-[12.5px] text-[color:var(--text-quaternary)]">
            {q.responseCount} {q.responseCount === 1 ? "response" : "responses"}
          </div>
        )}
      </div>

      {q.type === "LINEAR_SCALE" && <ScaleBody q={q} />}

      {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOX") && (
        <>
          {Object.entries(q.counts).map(([opt, count]) => (
            <BarRow
              key={opt}
              label={opt}
              count={count}
              total={q.responseCount}
              soft={q.type === "CHECKBOX"}
            />
          ))}
          {q.type === "CHECKBOX" && (
            <p className="mt-3.5 border-t border-[color:var(--border-secondary)] pt-3 text-[12.5px] text-[color:var(--text-quaternary)]">
              People could pick more than one, so percentages add up past 100%.
            </p>
          )}
        </>
      )}

      {(q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") && (
        <OpenTextBody q={q} isAnonymous={isAnonymous} />
      )}
    </div>
  );
}

function ScaleBody({ q }: { q: Extract<QuestionResult, { type: "LINEAR_SCALE" }> }) {
  const total = Object.values(q.distribution).reduce((a, b) => a + b, 0);
  const values = Object.keys(q.distribution).map(Number);
  const scaleMax = values.length ? Math.max(...values) : q.max;
  return (
    <div>
      <div className="mb-3.5 flex items-baseline gap-3">
        <span className="text-[34px] font-bold leading-none tracking-tight text-[color:var(--text-primary)]">
          {q.average.toFixed(1)}
        </span>
        <span className="text-[13.5px] text-[color:var(--text-tertiary)]">
          average out of {scaleMax}
        </span>
      </div>
      {Object.entries(q.distribution)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([val, count]) => (
          <BarRow key={val} label={val} count={count} total={total} />
        ))}
    </div>
  );
}

function OpenTextBody({
  q,
  isAnonymous,
}: {
  q: Extract<QuestionResult, { type: "SHORT_ANSWER" | "LONG_ANSWER" }>;
  isAnonymous: boolean;
}) {
  const hidden = isAnonymous || q.responses.length === 0;
  return (
    <div>
      <div className="mb-3.5">
        <span className="text-[13.5px] text-[color:var(--text-tertiary)]">
          {q.responseCount} written {q.responseCount === 1 ? "response" : "responses"}
        </span>
      </div>
      {isAnonymous ? (
        <p className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-3 text-[13.5px] text-[color:var(--text-tertiary)]">
          Individual answers are hidden for anonymous surveys — only the response count is shown.
        </p>
      ) : hidden ? (
        <p className="text-[13.5px] text-[color:var(--text-tertiary)]">No responses yet.</p>
      ) : (
        <div className="space-y-2.5">
          {q.responses.map((text, i) => (
            <div
              key={i}
              className="rounded-xl border border-[color:var(--border-primary)] px-4 py-3"
            >
              <div className="mb-1 text-[12px] font-semibold text-[color:var(--text-quaternary)]">
                Response {i + 1}
              </div>
              <div className="text-[14.5px] text-[color:var(--text-primary)]">{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * HR-only action to deliberately share a small anonymous team's results with that team's
 * supervisor (who is otherwise blocked from the breakdown). Disabled with a clear reason until
 * the occurrence closes; requires an explicit confirm before sending the semi-identifiable data.
 */
export function ShareToSupervisorCard({
  share,
  surveyName,
  surveyId,
}: {
  share: SmallTeamShare;
  surveyName: string;
  surveyId: string;
}) {
  const confirm = useConfirm();
  const shareMutation = useShareResults(surveyId);

  const hasSupervisor = !!share.supervisorId;
  const supervisorLabel = share.supervisorName ?? "the team's supervisor";
  const canSend = hasSupervisor && share.occurrenceCompleted;
  const reason = !hasSupervisor
    ? "This team has no supervisor to send results to."
    : !share.occurrenceCompleted
      ? "Available once this survey closes."
      : null;

  const handleSend = () => {
    void confirm({
      title: `Send results to ${supervisorLabel}?`,
      description: `Send ${surveyName} results for ${share.teamName} to ${supervisorLabel}? They will be able to see individual responses for this small team.`,
      confirmLabel: "Send results",
      confirmLoadingLabel: "Sending…",
      onConfirm: async () => {
        try {
          await shareMutation.mutateAsync({
            teamId: share.teamId,
            occurrenceId: share.occurrenceId,
          });
          toast.success(`Results sent to ${supervisorLabel}.`);
        } catch (e) {
          toast.error(
            e instanceof ApiError ? e.message : "Couldn't send results. Please try again.",
          );
          throw e; // keep the dialog open so HR can retry
        }
      },
    });
  };

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[color:var(--text-primary)]">
          Share with the team&apos;s supervisor
        </p>
        <p className="mt-1 text-[13px] text-[color:var(--text-tertiary)]">
          {share.alreadySharedAt
            ? `Sent to ${supervisorLabel} on ${fmtDay(share.alreadySharedAt)}. They can now view this small team's results.`
            : `${supervisorLabel} can't normally see this small team's anonymous results. ${
                reason ?? "You can deliberately share them."
              }`}
        </p>
      </div>
      <Button
        variant="secondary"
        onClick={handleSend}
        disabled={!canSend}
        title={reason ?? undefined}
        className="flex-none"
      >
        <Send size={15} />
        {share.alreadySharedAt ? "Send again" : "Send to supervisor"}
      </Button>
    </div>
  );
}

// ─── container ──────────────────────────────────────────────────────────────────

/** Results dashboard for one survey: header, summary stats, scope filters, per-question charts.
 *  canFilter (default true) controls whether HR-only features (getSurvey, ResultsFilters) are active.
 *  initialFilter / initialOccurrenceId seed the view from a deep link — used when a supervisor
 *  opens an HR-shared small-team result, where the filter UI is hidden (canFilter=false). */
export function SurveyResults({
  surveyId,
  canFilter = true,
  initialFilter,
  initialOccurrenceId,
}: {
  surveyId: string;
  canFilter?: boolean;
  initialFilter?: ResultsFilter;
  initialOccurrenceId?: string;
}) {
  const [filter, setFilter] = useState<ResultsFilter>(initialFilter ?? {});
  // Selected round. undefined → the server reports on the latest occurrence (its id comes
  // back as results.occurrenceId, which then drives the picker's displayed value).
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | undefined>(
    initialOccurrenceId,
  );
  // HR fetches full detail for the rich header + subtitle; non-HR derive the header
  // from the results DTO so they never hit the HR-only getSurvey endpoint.
  const { data: survey } = useSurvey(canFilter ? surveyId : null);
  // Round picker is HR-only (the occurrences endpoint is HR-gated). Non-HR still get the
  // latest-round fix via the server default, just without the ability to switch rounds.
  const occurrencesQuery = useSurveyOccurrences(canFilter ? surveyId : null);
  const occurrences = useMemo(() => occurrencesQuery.data ?? [], [occurrencesQuery.data]);
  const query = useSurveyResults(surveyId, filter, selectedOccurrenceId);
  const results = query.data;

  const multiRound = occurrences.length > 1;
  // Show the chosen round, else whichever round the server reported on, else the latest
  // (occurrences are sorted newest-first) so the trigger has a value before results land.
  const currentOccurrenceId =
    selectedOccurrenceId ?? results?.occurrenceId ?? occurrences[0]?.id;

  // Surface the survey name as the trailing breadcrumb crumb — works on both the HR
  // results route (Organization › Surveys › {name}) and the shared non-HR route
  // (Performance › {name}). Empty while the name is still loading.
  const headerName = survey?.name ?? results?.surveyName ?? "";
  usePageBreadcrumb(headerName ? [headerName] : []);

  const status = survey
    ? deriveStatus(survey)
    : results
      ? deriveStatus({ isActive: results.isActive, occurrenceCount: results.occurrenceCount })
      : null;
  const STATUS_VARIANT = { active: "success", draft: "neutral", closed: "warning" } as const;

  const filterActive = !!(filter.teamId || filter.supervisorId);
  const canExport = !!results && !results.suppressed && results.respondedCount > 0;

  const deadlineIso = survey?.deadline ?? results?.deadline;
  const daysLeft = deadlineIso
    ? Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 86_400_000)
    : null;
  const untilCloses =
    status !== "active"
      ? "Closed"
      : daysLeft === null
        ? "—"
        : daysLeft <= 0
          ? "Due now"
          : `${daysLeft} ${daysLeft === 1 ? "day" : "days"}`;

  const handleExport = () => {
    if (!results) return;
    const name = survey?.name?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() ?? "survey";
    downloadCsv(`${name}-results.csv`, buildCsv(survey, results));
    toast.success("Results exported.");
  };

  const showingText = results
    ? results.suppressed
      ? "Showing fewer than 3 responses"
      : filterActive
        ? `Showing ${results.totalResponses} of ${results.respondedCount} responses`
        : `Showing all ${results.respondedCount} responses`
    : "";

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-bold tracking-tight text-[color:var(--text-primary)]">
              {headerName || "Survey results"}
            </h1>
            {status && (
              <Badge variant={STATUS_VARIANT[status]} pill>
                <BadgeDot />
                {STATUS_LABEL[status]}
              </Badge>
            )}
            {(survey?.isAnonymous ?? results?.isAnonymous) && (
              <Badge variant="brand" pill>
                Anonymous
              </Badge>
            )}
          </div>
          {survey && (
            <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
              {AUDIENCE_TYPE_LABEL[survey.audienceType]} · {RECURRING_TYPE_LABEL[survey.recurringType]}{" "}
              · opened {fmtDay(survey.releaseDate)}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={!canExport}>
          <Download size={15} />
          Export
        </Button>
      </div>

      {/* Round picker — recurring surveys only. Each round has its own audience + responses;
          aggregating across rounds would double-count the recurring audience. Defaults to the
          latest round; pick a past one to inspect it. */}
      {multiRound && (
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">Round</span>
          <Select
            value={currentOccurrenceId ?? ""}
            onValueChange={(v: string) => setSelectedOccurrenceId(v)}
          >
            <SelectTrigger className="w-full sm:w-[300px]" aria-label="Select survey round">
              <SelectValue placeholder="Latest round" />
            </SelectTrigger>
            <SelectContent>
              {occurrences.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  Round {o.occurrenceNumber} · {fmtDay(o.releaseDate)} — {o.completionCount} of{" "}
                  {o.audienceSize}
                  {!o.isClosed ? " · current" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {query.isLoading && <ResultsSkeleton />}

      {query.isError &&
        (isSmallTeamSupervisorBlock(query.error) ? (
          <div className="flex gap-3 rounded-2xl border border-[#FEDF89] bg-[color:var(--color-warning-50)] p-4 text-[color:var(--color-warning-600)]">
            <Lock size={18} className="mt-0.5 flex-none" />
            <div>
              <p className="text-sm font-bold">Results hidden for this team&apos;s supervisor.</p>
              <p className="mt-1 text-[13px] font-medium">
                This team has fewer than 3 members, so its anonymous results aren&apos;t shown to the
                team&apos;s supervisor. HR and managers above the supervisor can view them.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
            <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
            <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
              {query.error.message}
            </span>
            <button
              onClick={() => void query.refetch()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ))}

      {results && (
        <>
          {/* Stat cards */}
          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <StatCard
              value={`${pct(results.respondedCount, results.recipientCount)}%`}
              label="Response rate"
            />
            <StatCard
              value={`${results.respondedCount} of ${results.recipientCount}`}
              label="Responses"
            />
            <StatCard value={untilCloses} label="Until it closes" />
          </div>

          {!results.suppressed && results.totalResponses > 0 && (
            <AiInsightsPanel
              surveyId={surveyId}
              isAnonymous={results.isAnonymous}
              hasOpenText={results.questions.some(
                (q) => q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER",
              )}
            />
          )}

          {/* Filters + showing line */}
          {canFilter && <ResultsFilters filter={filter} onChange={setFilter} />}
          <p className="mb-4 mt-2 text-[13px] text-[color:var(--text-tertiary)]">{showingText}</p>

          {/* HR-only: deliberately share this small anonymous team's results with its supervisor. */}
          {canFilter && results.smallTeamShare && (
            <ShareToSupervisorCard
              share={results.smallTeamShare}
              surveyName={headerName || results.surveyName}
              surveyId={surveyId}
            />
          )}

          {results.suppressed ? (
            <div className="flex gap-3 rounded-2xl border border-[#FEDF89] bg-[color:var(--color-warning-50)] p-4 text-[color:var(--color-warning-600)]">
              <Lock size={18} className="mt-0.5 flex-none" />
              <div>
                <p className="text-sm font-bold">Not enough responses to show results anonymously.</p>
                <p className="mt-1 text-[13px] font-medium">
                  This view has fewer than 3 responses, so we can&apos;t show any results — even a
                  summary — without risking someone being identified.
                  {canFilter ? " Try widening your filter." : ""}
                </p>
              </div>
            </div>
          ) : results.totalResponses === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No responses yet"
              body="Results will appear here once the audience starts answering."
            />
          ) : (
            <div className="space-y-4">
              {results.questions.map((q) => (
                <QuestionCard key={q.questionId} q={q} isAnonymous={results.isAnonymous} />
              ))}
            </div>
          )}

          {/* Authority-gated individual drill-down (named surveys only). Self-hides when the
              viewer has no one to drill into — the server is the authority. */}
          <RespondentsDrilldown
            occurrenceId={currentOccurrenceId}
            isAnonymous={results.isAnonymous}
          />
        </>
      )}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[92px] rounded-2xl border border-[color:var(--border-primary)] bg-white"
          />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-52 rounded-2xl border border-[color:var(--border-primary)] bg-white"
        />
      ))}
    </div>
  );
}
