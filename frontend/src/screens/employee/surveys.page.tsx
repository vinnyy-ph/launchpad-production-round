"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ClipboardList, AlertCircle, RefreshCw, CheckSquare, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button, Badge } from "@/shared/ui";
import { EmptyState, PageTabs } from "@/shared/ui/patterns";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEvaluations } from "@/modules/performance/evaluations/hooks/use-evaluations";
import { useAcknowledgeEvaluation } from "@/modules/performance/evaluations/hooks/use-acknowledge-evaluation";
import { ReviewEvaluationDialog } from "@/modules/performance/evaluations/components/review-evaluation-dialog";
import type { Evaluation as PerfEvaluation } from "@/modules/performance/evaluations/types/evaluations.types";
import { useMySurveys } from "@/modules/performance/surveys/hooks/use-my-surveys";
import { useAnsweredSurveys } from "@/modules/performance/surveys/hooks/use-answered-surveys";
import { SurveyCard } from "@/modules/performance/surveys/components/survey-card";
import { TakeSurveyDialog } from "@/modules/performance/surveys/components/take-survey-dialog";
import { MyAnswersDialog } from "@/modules/performance/surveys/components/my-answers-dialog";
import type {
  PendingSurvey,
  AnsweredSurvey,
} from "@/modules/performance/surveys/types/surveys.types";
import { VisibleResultsList } from "@/modules/performance/surveys/components/visible-results-list";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPeriod(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
      {children}
    </p>
  );
}

/** An evaluation issued to the employee stays pending until acknowledged or deemed-acknowledged. */
function isPendingAck(ev: PerfEvaluation): boolean {
  const ack = ev.acknowledgement;
  return ev.isSent && !ack?.acknowledgedAt && !ack?.isDeemedAck;
}

function useMyEvaluations(employeeId: string) {
  const { data, isLoading, isError, refetch } = useEvaluations();
  const ackMutation = useAcknowledgeEvaluation();

  // Only evaluations that were issued TO this employee and have been sent.
  const evals = useMemo(
    () => (data ?? []).filter((e) => e.isSent && e.revieweeId === employeeId),
    [data, employeeId],
  );

  const acknowledge = (evaluationId: string) => {
    ackMutation.mutate(evaluationId, {
      onSuccess: () => toast.success("Evaluation acknowledged"),
      onError: () => toast.error("Could not acknowledge — please try again."),
    });
  };

  return {
    evals,
    loading: isLoading,
    error: isError ? "Could not load your evaluations." : null,
    reload: () => void refetch(),
    acknowledge,
    acknowledging: ackMutation.isPending,
  };
}

// ─── Pulse surveys tab ────────────────────────────────────────────────────────

interface SurveysTabProps {
  pending: PendingSurvey[];
  answered: AnsweredSurvey[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  initialOccurrenceId?: string | null;
}

function SurveysTab({
  pending,
  answered,
  loading,
  error,
  onReload,
  initialOccurrenceId,
}: SurveysTabProps) {
  const [takingId, setTakingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AnsweredSurvey | null>(null);

  // Auto-open the taker once when arriving from a "new pulse" notification/banner.
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current) return;
    if (initialOccurrenceId && pending.some((p) => p.occurrenceId === initialOccurrenceId)) {
      setTakingId(initialOccurrenceId);
      deepLinkApplied.current = true;
    }
  }, [initialOccurrenceId, pending]);

  if (loading) {
    return (
      <div className="space-y-3 pt-1">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          >
            <div className="h-4 w-48 rounded bg-[color:var(--bg-tertiary)]" />
            <div className="mt-2 h-3 w-64 rounded bg-[color:var(--bg-tertiary)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
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

  const takingSurvey = pending.find((p) => p.occurrenceId === takingId) ?? null;

  if (pending.length === 0 && answered.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={ClipboardList}
          title="You're all caught up"
          body="No pulse surveys are open for you right now. Check back later."
        />
      </div>
    );
  }

  return (
    <div className="pt-4">
      <section className="mb-8">
        <SectionHeader>To answer</SectionHeader>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((p) => (
              <SurveyCard
                key={p.occurrenceId}
                survey={p}
                onTake={() => setTakingId(p.occurrenceId)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[color:var(--border-strong)] px-5 py-6 text-center text-sm text-[color:var(--text-tertiary)]">
            You&apos;re all caught up — nothing to answer right now.
          </p>
        )}
      </section>

      {answered.length > 0 && (
        <section>
          <SectionHeader>Answered</SectionHeader>
          <div
            className="divide-y divide-[color:var(--border-secondary)] overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            {answered.map((a) => (
              <button
                key={a.occurrenceId}
                onClick={() => setViewing(a)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[color:var(--bg-secondary)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                    {a.surveyName}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                    {a.occurrenceNumber > 1 ? `Round ${a.occurrenceNumber} · ` : ""}Answered{" "}
                    {new Date(a.completedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2.5">
                  <Badge variant={a.isAnonymous ? "brand" : "modern"} size="sm" pill>
                    {a.isAnonymous ? "Anonymous" : "Named"}
                  </Badge>
                  <ChevronRight size={16} className="text-[color:var(--text-quaternary)]" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <TakeSurveyDialog
        open={!!takingId}
        survey={takingSurvey}
        onClose={() => setTakingId(null)}
        onSubmitted={() => {
          setTakingId(null);
          onReload();
        }}
      />

      <MyAnswersDialog
        open={!!viewing}
        answered={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

// ─── Evaluations tab ──────────────────────────────────────────────────────────

interface AcksTabProps {
  evals: PerfEvaluation[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onAcknowledge: (evaluationId: string) => void;
  acknowledging: boolean;
  initialExpandedId?: string | null;
}

function AcknowledgementsTab({
  evals,
  loading,
  error,
  onReload,
  onAcknowledge,
  acknowledging,
  initialExpandedId,
}: AcksTabProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Open the exact evaluation once when arriving from a "new evaluation" notification.
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current) return;
    if (initialExpandedId && evals.some((e) => e.id === initialExpandedId)) {
      setReviewingId(initialExpandedId);
      deepLinkApplied.current = true;
    }
  }, [initialExpandedId, evals]);

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          >
            <div className="h-3.5 w-40 rounded bg-[color:var(--bg-tertiary)]" />
            <div className="mt-2 h-2.5 w-24 rounded bg-[color:var(--bg-tertiary)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
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

  if (evals.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={CheckSquare}
          title="No evaluations shared yet"
          body="Your supervisor will share a performance evaluation here when it is ready."
        />
      </div>
    );
  }

  const reviewing = evals.find((e) => e.id === reviewingId) ?? null;

  const pendingEvals = evals.filter((e) => {
    const a = e.acknowledgement;
    return !a?.acknowledgedAt && !a?.isDeemedAck;
  });
  const pastEvals = evals.filter((e) => {
    const a = e.acknowledgement;
    return !!a?.acknowledgedAt || !!a?.isDeemedAck;
  });

  const renderRow = (ev: PerfEvaluation) => {
    const ack = ev.acknowledgement;
    const isAcknowledged = !!ack?.acknowledgedAt;
    const isDeemed = !isAcknowledged && !!ack?.isDeemedAck;
    const pending = !isAcknowledged && !isDeemed;

    return (
      <div
        key={ev.id}
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-5 py-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[color:var(--text-primary)] text-sm font-bold text-white">
            {ev.grade}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
              Performance evaluation · from {ev.reviewer?.fullName ?? "Your supervisor"}
            </p>
            <p className="truncate text-xs text-[color:var(--text-tertiary)]">
              {formatPeriod(ev.periodStart, ev.periodEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAcknowledged && <Badge variant="success">Acknowledged</Badge>}
          {isDeemed && <Badge variant="warning">Deemed acknowledged</Badge>}
          {pending && <Badge variant="neutral">Pending</Badge>}
          <Button
            variant={pending ? undefined : "secondary"}
            size="sm"
            onClick={() => setReviewingId(ev.id)}
          >
            {pending ? "Review" : "View"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pt-4">
      {pendingEvals.length > 0 && (
        <section>
          <SectionHeader>Needs your acknowledgment</SectionHeader>
          <div className="space-y-3">{pendingEvals.map(renderRow)}</div>
        </section>
      )}

      {pastEvals.length > 0 && (
        <section>
          <SectionHeader>Past evaluations</SectionHeader>
          <div className="space-y-3">{pastEvals.map(renderRow)}</div>
        </section>
      )}

      <ReviewEvaluationDialog
        open={!!reviewingId}
        evaluation={reviewing}
        onClose={() => setReviewingId(null)}
        onAcknowledge={onAcknowledge}
        acknowledging={acknowledging}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeSurveysPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId ?? "e-emp";

  const mySurveys = useMySurveys();
  const pending = mySurveys.data ?? [];
  const myAnswered = useAnsweredSurveys();
  const answered = myAnswered.data ?? [];

  const {
    evals,
    loading: evalLoading,
    error: evalError,
    reload: reloadEvals,
    acknowledge,
    acknowledging,
  } = useMyEvaluations(employeeId);

  // Notification click-to-land: open the exact tab/item the link points at.
  const [tab, setTab] = useState<"survey" | "acknowledgements" | "results">("survey");
  const [deepLink, setDeepLink] = useState<{ pulse: string | null; eval: string | null }>({
    pulse: null,
    eval: null,
  });
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ev = p.get("eval");
    const pulse = p.get("pulse");
    if (p.get("tab") === "acknowledgements" || ev) setTab("acknowledgements");
    setDeepLink({ pulse, eval: ev });
  }, []);

  const pendingAcks = evals.filter(isPendingAck).length;
  const unansweredCount = pending.length;

  return (
    <div>
      <PageHeader
        level="page"
        title="Performance"
        subtitle="Answer active pulse surveys and acknowledge your performance evaluations."
      />

      <PageTabs
        ariaLabel="Performance sections"
        value={tab}
        onChange={(v) => setTab(v as "survey" | "acknowledgements" | "results")}
        items={[
          { value: "survey", label: "Pulse surveys", count: unansweredCount },
          { value: "acknowledgements", label: "Evaluations", count: pendingAcks },
          { value: "results", label: "Results" },
        ]}
      />

      {tab === "survey" ? (
        <SurveysTab
          pending={pending}
          answered={answered}
          loading={mySurveys.isLoading}
          error={mySurveys.isError ? (mySurveys.error?.message ?? "Could not load surveys.") : null}
          onReload={() => void mySurveys.refetch()}
          initialOccurrenceId={deepLink.pulse}
        />
      ) : tab === "acknowledgements" ? (
        <AcknowledgementsTab
          evals={evals}
          loading={evalLoading}
          error={evalError}
          onReload={reloadEvals}
          onAcknowledge={acknowledge}
          acknowledging={acknowledging}
          initialExpandedId={deepLink.eval}
        />
      ) : (
        <div className="pt-4">
          <VisibleResultsList />
        </div>
      )}
    </div>
  );
}
