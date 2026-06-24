"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Download,
  Lock,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  BadgeDot,
  Button,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useConfirm,
} from "@/shared/ui";
import { EmptyState, Spinner } from "@/shared/ui/patterns";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { usePageBreadcrumb } from "@/shared/components/layout/breadcrumb-context";
import { useSurvey } from "../hooks/use-survey";
import { useSurveyResults } from "../hooks/use-survey-results";
import { useSurveyOccurrences } from "../hooks/use-survey-occurrences";
import { useShareResults } from "../hooks/use-share-results";
import { useNoteSuggestions } from "../hooks/use-note-suggestions";
import type {
  QuestionResult,
  ResultsFilter,
  SharedNote,
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

const OPEN_TEXT_PAGE_SIZE = 10;

function OpenTextBody({
  q,
  isAnonymous,
}: {
  q: Extract<QuestionResult, { type: "SHORT_ANSWER" | "LONG_ANSWER" }>;
  isAnonymous: boolean;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(OPEN_TEXT_PAGE_SIZE);

  const hidden = isAnonymous || q.responses.length === 0;

  // Keep each response's original 1-based number stable even while filtered.
  const indexed = q.responses.map((text, i) => ({ text, number: i + 1 }));
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? indexed.filter((r) => r.text.toLowerCase().includes(trimmed))
    : indexed;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setVisibleCount(OPEN_TEXT_PAGE_SIZE);
  };

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
        <>
          <div className="mb-3">
            <SearchInput
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Search answers"
              aria-label="Search written answers"
            />
          </div>

          {trimmed && (
            <p className="mb-2.5 text-[12.5px] text-[color:var(--text-quaternary)]">
              Showing {filtered.length} of {q.responses.length}
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="text-[13.5px] text-[color:var(--text-tertiary)]">
              No answers match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <>
              <div className="space-y-2.5">
                {visible.map((r) => (
                  <div
                    key={r.number}
                    className="rounded-xl border border-[color:var(--border-primary)] px-4 py-3"
                  >
                    <div className="mb-1 text-[12px] font-semibold text-[color:var(--text-quaternary)]">
                      Response {r.number}
                    </div>
                    <div className="text-[14.5px] text-[color:var(--text-primary)]">{r.text}</div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setVisibleCount((c) => c + OPEN_TEXT_PAGE_SIZE)}
                >
                  Load more
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const NOTE_MAX = 2000;

/**
 * HR-only: compose and send the team's supervisor an open-text NOTE about their small anonymous
 * team's results. The supervisor sees this note instead of the breakdown (which stays hidden to
 * preserve anonymity), so HR summarises the results in their own words — optionally starting from
 * an AI-drafted suggestion. Sending is disabled with a clear reason until the occurrence closes
 * and a note has been written, and confirmed before it goes out (in-app + email).
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
  const suggestMutation = useNoteSuggestions(surveyId);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const hasSupervisor = !!share.supervisorId;
  const supervisorLabel = share.supervisorName ?? "the team's supervisor";
  const trimmed = message.trim();
  const canSend =
    hasSupervisor && share.occurrenceCompleted && trimmed.length > 0 && trimmed.length <= NOTE_MAX;
  const sendReason = !hasSupervisor
    ? "This team has no supervisor to send a note to."
    : !share.occurrenceCompleted
      ? "You can send a note once this survey closes."
      : trimmed.length === 0
        ? "Write a note to send."
        : null;

  const handleSuggest = async () => {
    try {
      const out = await suggestMutation.mutateAsync({
        teamId: share.teamId,
        occurrenceId: share.occurrenceId,
      });
      setSuggestions(out);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.errorCode === "AI_UNAVAILABLE"
          ? "AI suggestions are unavailable right now — please write a note yourself."
          : e instanceof ApiError
            ? e.message
            : "Couldn't draft suggestions. Please try again.",
      );
    }
  };

  const handleSend = () => {
    void confirm({
      title: `Send your note to ${supervisorLabel}?`,
      description: `We'll send your note about ${surveyName} for ${share.teamName} to ${supervisorLabel} — in the app and by email. They'll see your note, not the individual anonymous responses.`,
      confirmLabel: "Send to supervisor",
      confirmLoadingLabel: "Sending…",
      onConfirm: async () => {
        try {
          await shareMutation.mutateAsync({
            teamId: share.teamId,
            occurrenceId: share.occurrenceId,
            message: trimmed,
          });
          toast.success(`Note sent to ${supervisorLabel}.`);
        } catch (e) {
          toast.error(
            e instanceof ApiError ? e.message : "Couldn't send your note. Please try again.",
          );
          throw e; // keep the dialog open so HR can retry
        }
      },
    });
  };

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-[color:var(--text-primary)]">
          Share with the team&apos;s supervisor
        </p>
        <p className="mt-1 text-[13px] text-[color:var(--text-tertiary)]">
          {share.alreadySharedAt
            ? `Last sent to ${supervisorLabel} on ${fmtDay(share.alreadySharedAt)}. Sending again replaces your note.`
            : `${supervisorLabel} can't see this small team's anonymous responses. Write them a short note about the results instead — they'll get it in the app and by email.`}
        </p>
      </div>

      <div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={NOTE_MAX}
          rows={4}
          placeholder="Write a note about this team's results…"
          className="bg-white"
          aria-label="Note to the supervisor"
        />
        <div className="mt-1 text-right text-[11.5px] text-[color:var(--text-quaternary)]">
          {trimmed.length}/{NOTE_MAX}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={() => void handleSuggest()}
          disabled={!hasSupervisor || suggestMutation.isPending}
        >
          {suggestMutation.isPending ? <Spinner size={15} /> : <Sparkles size={15} />}
          {suggestMutation.isPending ? "Drafting…" : "Suggest messages"}
        </Button>
        <Button onClick={handleSend} disabled={!canSend} title={sendReason ?? undefined}>
          <Send size={15} />
          {share.alreadySharedAt ? "Send again" : "Send note"}
        </Button>
        {sendReason && (
          <span className="text-[12.5px] text-[color:var(--text-quaternary)]">{sendReason}</span>
        )}
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[color:var(--text-quaternary)]">
            Tap a suggestion to use it
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, i) => {
              const active = message === s;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMessage(s)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-left text-[13.5px] leading-relaxed transition-colors",
                    active
                      ? "border-[color:var(--text-primary)] bg-white text-[color:var(--text-primary)]"
                      : "border-[color:var(--border-primary)] bg-white text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)]",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shown to a small anonymous team's supervisor who reaches the results via an HR share: HR's
 * open-text note in place of the breakdown (which stays hidden to preserve anonymity).
 */
function SharedNoteCard({ note }: { note: SharedNote }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 shadow-[0_1px_3px_-1px_rgba(16,18,24,0.07),0_7px_16px_-6px_rgba(16,18,24,0.11)] sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareText size={18} className="text-[color:var(--text-tertiary)]" />
        <h3 className="text-[16.5px] font-bold tracking-tight text-[color:var(--text-primary)]">
          Message from HR
        </h3>
      </div>
      <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-[color:var(--text-primary)]">
        {note.message}
      </p>
      <p className="mt-4 border-t border-[color:var(--border-secondary)] pt-3 text-[12.5px] text-[color:var(--text-quaternary)]">
        Shared by {note.sharedByName ?? "HR"} on {fmtDay(note.sharedAt)}. This team has fewer than 3
        members, so its anonymous responses aren&apos;t shown individually — HR has summarised them
        for you above.
      </p>
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

      {/* Small-team supervisor reading via an HR share: show HR's note, not the breakdown. */}
      {results?.sharedNote && <SharedNoteCard note={results.sharedNote} />}

      {results && !results.sharedNote && (
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
