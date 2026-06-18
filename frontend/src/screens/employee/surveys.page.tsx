"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import { EmptyState } from "@/shared/ui/patterns";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEvaluations } from "@/modules/performance/evaluations/hooks/use-evaluations";
import { useAcknowledgeEvaluation } from "@/modules/performance/evaluations/hooks/use-acknowledge-evaluation";
import type { Evaluation as PerfEvaluation } from "@/modules/performance/evaluations/types/evaluations.types";
import { useMySurveys } from "@/modules/performance/surveys/hooks/use-my-surveys";
import { useSubmitResponse } from "@/modules/performance/surveys/hooks/use-submit-response";
import {
  QuestionField,
  type AnswerValue,
} from "@/modules/performance/surveys/components/questions/question-field";
import { SurveyCard } from "@/modules/performance/surveys/components/survey-card";
import type {
  PendingSurvey,
  AnswerInput,
  Question,
} from "@/modules/performance/surveys/types/surveys.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs improvement",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Exceptional",
};

function formatPeriod(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`;
}

/** An evaluation issued to the employee stays pending until acknowledged or deemed-acknowledged. */
function isPendingAck(ev: PerfEvaluation): boolean {
  const ack = ev.acknowledgement;
  return ev.isSent && !ack?.acknowledgedAt && !ack?.isDeemedAck;
}

/** Build the wire payload for one question from its in-form value. Returns null when an
 *  optional question was left blank (so it is simply omitted). */
function toAnswerInput(question: Question, value: AnswerValue): AnswerInput | null {
  switch (question.type) {
    case "SHORT_ANSWER":
    case "LONG_ANSWER": {
      const text = typeof value === "string" ? value.trim() : "";
      return text === "" ? null : { questionId: question.id, answerText: text };
    }
    case "LINEAR_SCALE":
      return typeof value === "number" ? { questionId: question.id, answerData: value } : null;
    case "MULTIPLE_CHOICE":
      return typeof value === "string" && value !== ""
        ? { questionId: question.id, answerData: value }
        : null;
    case "CHECKBOX":
      return Array.isArray(value) && value.length > 0
        ? { questionId: question.id, answerData: value }
        : null;
    default:
      return null;
  }
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
      onSuccess: () => toast.success("Evaluation acknowledged."),
      onError: () => toast.error("Could not acknowledge — please try again."),
    });
  };

  return {
    evals,
    loading: isLoading,
    error: isError ? "Could not load your evaluations." : null,
    reload: () => void refetch(),
    acknowledge,
  };
}

// ─── Survey taker ─────────────────────────────────────────────────────────────

function SurveyTaker({
  survey,
  onSubmitted,
  onCancel,
}: {
  survey: PendingSurvey;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useSubmitResponse();

  const setAnswer = (qid: string, value: AnswerValue) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const q of survey.questions) {
      if (!q.isRequired) continue;
      const a = answers[q.id];
      const empty = a === undefined || a === "" || (Array.isArray(a) && a.length === 0);
      if (empty) errs[q.id] = "Please answer this question.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = survey.questions
      .map((q) => toAnswerInput(q, answers[q.id]))
      .filter((a): a is AnswerInput => a !== null);

    submit.mutate(
      { occurrenceId: survey.occurrenceId, answers: payload },
      {
        onSuccess: () => {
          toast.success("Response submitted — thank you.");
          onSubmitted();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[color:var(--text-primary)]">
              {survey.surveyName}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
              {survey.questions.length}{" "}
              {survey.questions.length === 1 ? "question" : "questions"} · Due{" "}
              {new Date(survey.deadline).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submit.isPending}
            className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
          >
            Cancel
          </button>
        </div>
      </div>

      {survey.questions.map((q, idx) => (
        <QuestionField
          key={q.id}
          question={q}
          index={idx}
          value={answers[q.id]}
          error={errors[q.id]}
          onChange={(v) => setAnswer(q.id, v)}
          disabled={submit.isPending}
        />
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit response"}
        </Button>
      </div>
    </div>
  );
}

// ─── Survey list (Pulse surveys tab) ─────────────────────────────────────────

interface SurveysTabProps {
  pending: PendingSurvey[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  initialOccurrenceId?: string | null;
}

function SurveysTab({ pending, loading, error, onReload, initialOccurrenceId }: SurveysTabProps) {
  const [takingId, setTakingId] = useState<string | null>(null);

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

  if (pending.length === 0) {
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

  if (takingId) {
    const survey = pending.find((p) => p.occurrenceId === takingId);
    if (survey) {
      return (
        <div className="pt-4">
          <SurveyTaker
            survey={survey}
            onSubmitted={() => setTakingId(null)}
            onCancel={() => setTakingId(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-3 pt-4">
      {pending.map((p) => (
        <SurveyCard key={p.occurrenceId} survey={p} onTake={() => setTakingId(p.occurrenceId)} />
      ))}
    </div>
  );
}

// ─── Acknowledgements tab ─────────────────────────────────────────────────────

interface AcksTabProps {
  evals: PerfEvaluation[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onAcknowledge: (evaluationId: string) => void;
  initialExpandedId?: string | null;
}

function AcknowledgementsTab({
  evals,
  loading,
  error,
  onReload,
  onAcknowledge,
  initialExpandedId,
}: AcksTabProps) {
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Expand the exact evaluation once when arriving from a "new evaluation" notification.
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current) return;
    if (initialExpandedId && evals.some((e) => e.id === initialExpandedId)) {
      setExpandedId(initialExpandedId);
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

  return (
    <div className="space-y-3 pt-4">
      {evals.map((ev) => {
        const ack = ev.acknowledgement;
        const isExpanded = expandedId === ev.id;
        const isAcknowledged = !!ack?.acknowledgedAt;
        const isDeemedAck = !isAcknowledged && !!ack?.isDeemedAck;

        return (
          <div
            key={ev.id}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {formatPeriod(ev.periodStart, ev.periodEnd)} · Performance evaluation
                  </p>
                  {isAcknowledged && <Badge variant="success">Acknowledged</Badge>}
                  {!isAcknowledged && isDeemedAck && (
                    <Badge variant="warning">Deemed acknowledged</Badge>
                  )}
                  {!isAcknowledged && !isDeemedAck && <Badge variant="neutral">Pending</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                  From {ev.reviewer?.fullName ?? "Your supervisor"} · Shared{" "}
                  {ev.sentAt ? new Date(ev.sentAt).toLocaleDateString() : "—"}
                </p>
              </div>
              {isExpanded ? (
                <ChevronUp
                  size={16}
                  className="text-[color:var(--text-quaternary)]"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={16}
                  className="text-[color:var(--text-quaternary)]"
                  aria-hidden="true"
                />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-[color:var(--border-primary)] px-5 pb-5 pt-4 space-y-4">
                {/* Grade */}
                {ev.grade !== undefined && ev.grade !== null && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Overall grade
                    </p>
                    <p className="text-sm text-[color:var(--text-primary)]">
                      <span className="mr-1.5 text-xl font-bold">{ev.grade}</span>
                      <span className="text-[color:var(--text-secondary)]">
                        — {GRADE_LABELS[ev.grade] ?? ""}
                      </span>
                    </p>
                  </div>
                )}

                {/* Highlights */}
                {ev.highlights && ev.highlights.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Highlights
                    </p>
                    <ul className="space-y-1">
                      {ev.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lowlights */}
                {ev.lowlights && ev.lowlights.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Areas for improvement
                    </p>
                    <ul className="space-y-1">
                      {ev.lowlights.map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evaluation text */}
                {ev.evaluation && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Evaluation
                    </p>
                    <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {ev.evaluation}
                    </p>
                  </div>
                )}

                {/* Recommendation text */}
                {ev.recommendation && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Recommendation
                    </p>
                    <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {ev.recommendation}
                    </p>
                  </div>
                )}

                {/* Supporting document */}
                {ev.supportingDocUrl && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Supporting document
                    </p>
                    <a
                      href={ev.supportingDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sm text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
                    >
                      {ev.supportingDocUrl}
                    </a>
                  </div>
                )}

                {/* Ack action */}
                {!isAcknowledged && isDeemedAck && (
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Deemed acknowledged on{" "}
                    {ev.ackDeadline ? new Date(ev.ackDeadline).toLocaleDateString() : "—"} — no
                    action needed.
                  </p>
                )}
                {isAcknowledged && (
                  <p className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                    <CheckCircle2 size={12} className="text-green-600" />
                    Acknowledged on{" "}
                    {ack?.acknowledgedAt
                      ? new Date(ack.acknowledgedAt).toLocaleDateString()
                      : "—"}
                  </p>
                )}
                {!isAcknowledged && !isDeemedAck && (
                  <Button onClick={() => setAckingId(ev.id)}>
                    <CheckCircle2 size={14} className="mr-1" />
                    Acknowledge
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <AlertDialog open={!!ackingId} onOpenChange={(o) => !o && setAckingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge this evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              By acknowledging, you confirm you have read and understood your performance
              evaluation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ackingId) onAcknowledge(ackingId);
                setAckingId(null);
              }}
            >
              Acknowledge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeSurveysPage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId ?? "e-emp";

  const mySurveys = useMySurveys();
  const pending = mySurveys.data ?? [];

  const {
    evals,
    loading: evalLoading,
    error: evalError,
    reload: reloadEvals,
    acknowledge,
  } = useMyEvaluations(employeeId);

  // Notification click-to-land: open the exact tab/item the link points at.
  const [tab, setTab] = useState<"survey" | "acknowledgements">("survey");
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as "survey" | "acknowledgements")}>
        <TabsList>
          <TabsTrigger value="survey">
            Pulse surveys{unansweredCount > 0 ? ` (${unansweredCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="acknowledgements">
            Evaluations{pendingAcks > 0 ? ` (${pendingAcks})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="survey" className="mt-5">
          <SurveysTab
            pending={pending}
            loading={mySurveys.isLoading}
            error={mySurveys.isError ? (mySurveys.error?.message ?? "Could not load surveys.") : null}
            onReload={() => void mySurveys.refetch()}
            initialOccurrenceId={deepLink.pulse}
          />
        </TabsContent>

        <TabsContent value="acknowledgements">
          <AcknowledgementsTab
            evals={evals}
            loading={evalLoading}
            error={evalError}
            onReload={reloadEvals}
            onAcknowledge={acknowledge}
            initialExpandedId={deepLink.eval}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
