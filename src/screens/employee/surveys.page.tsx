"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CheckSquare,
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
  Textarea,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Slider,
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
import { readCollection, writeCollection } from "@/shared/mock/db";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type {
  Survey,
  SurveyResponse,
  SurveyQuestion,
  Evaluation,
  Acknowledgement,
  DemoEmployee,
} from "@/shared/mock/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useActiveSurvey(employeeId: string) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const surveys = readCollection<Survey>("surveys");
      const active = surveys.find((s) => s.status === "ACTIVE") ?? null;
      setSurvey(active);
      if (active) {
        const responses = readCollection<SurveyResponse>("surveyResponses");
        setAlreadyAnswered(responses.some((r) => r.surveyId === active.id && r.employeeId === employeeId));
      } else {
        setAlreadyAnswered(false);
      }
    } catch {
      setError("Could not load the survey.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  return { survey, alreadyAnswered, loading, error, reload: load };
}

function useMyEvaluations(employeeId: string) {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [acks, setAcks] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const all = readCollection<Evaluation>("evaluations");
      const allAcks = readCollection<Acknowledgement>("acknowledgements");
      const mine = all.filter(
        (e) => e.employeeId === employeeId && (e.status === "SHARED" || e.status === "ACKNOWLEDGED"),
      );
      const myAcks = allAcks.filter((a) => a.employeeId === employeeId);
      setEvals(mine);
      setAcks(myAcks);
    } catch {
      setError("Could not load evaluations.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const acknowledge = useCallback(
    (evaluationId: string) => {
      const allAcks = readCollection<Acknowledgement>("acknowledgements");
      const now = new Date().toISOString();
      const updated = allAcks.map((a) =>
        a.evaluationId === evaluationId && a.employeeId === employeeId
          ? { ...a, acknowledgedAt: now }
          : a,
      );
      writeCollection("acknowledgements", updated);

      // Flip evaluation to ACKNOWLEDGED
      const allEvals = readCollection<Evaluation>("evaluations");
      writeCollection(
        "evaluations",
        allEvals.map((e) =>
          e.id === evaluationId ? { ...e, status: "ACKNOWLEDGED" as const } : e,
        ),
      );

      setAcks(updated.filter((a) => a.employeeId === employeeId));
      setEvals((prev) =>
        prev.map((e) => (e.id === evaluationId ? { ...e, status: "ACKNOWLEDGED" as const } : e)),
      );
    },
    [employeeId],
  );

  return { evals, acks, loading, error, reload: load, acknowledge };
}

// ─── Survey taker ─────────────────────────────────────────────────────────────

interface SurveyTakerProps {
  survey: Survey;
  employeeId: string;
  onSubmitted: () => void;
}

function SurveyTaker({ survey, employeeId, onSubmitted }: SurveyTakerProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setAnswer = (qid: string, value: string | string[] | number) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const toggleMulti = (qid: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = (prev[qid] as string[] | undefined) ?? [];
      return {
        ...prev,
        [qid]: checked ? [...current, option] : current.filter((o) => o !== option),
      };
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    survey.questions.forEach((q) => {
      const ans = answers[q.id];
      if (q.type === "TEXT") return; // optional
      if (ans === undefined || ans === "" || (Array.isArray(ans) && ans.length === 0))
        errs[q.id] = "Please answer this question.";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const responses = readCollection<SurveyResponse>("surveyResponses");
    const newResponse: SurveyResponse = {
      id: uid(),
      surveyId: survey.id,
      employeeId,
      answers,
      submittedAt: new Date().toISOString(),
    };
    writeCollection("surveyResponses", [...responses, newResponse]);
    toast.success("Response submitted — thank you!");
    onSubmitted();
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <h2 className="text-base font-bold text-[color:var(--text-primary)]">{survey.title}</h2>
        {survey.description && (
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{survey.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="neutral">{survey.audience}</Badge>
          {survey.anonymous && <Badge variant="success">Anonymous</Badge>}
        </div>
      </div>

      {survey.questions.map((q, idx) => (
        <QuestionInput
          key={q.id}
          q={q}
          idx={idx}
          answer={answers[q.id]}
          error={errors[q.id]}
          onChange={setAnswer}
          onToggleMulti={toggleMulti}
        />
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg">
          Submit response
        </Button>
      </div>
    </div>
  );
}

// ─── Question input ───────────────────────────────────────────────────────────

interface QuestionInputProps {
  q: SurveyQuestion;
  idx: number;
  answer: string | string[] | number | undefined;
  error?: string;
  onChange: (qid: string, value: string | string[] | number) => void;
  onToggleMulti: (qid: string, option: string, checked: boolean) => void;
}

function QuestionInput({ q, idx, answer, error, onChange, onToggleMulti }: QuestionInputProps) {
  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
        Q{idx + 1}
      </p>
      <p className="mb-4 text-sm font-medium text-[color:var(--text-primary)]">{q.prompt}</p>

      {q.type === "RATING" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Slider
              min={1}
              max={5}
              step={1}
              value={[typeof answer === "number" ? answer : 3]}
              onValueChange={([v]) => onChange(q.id, v)}
              className="flex-1"
            />
            <span className="w-6 text-center text-base font-bold text-[color:var(--text-primary)]">
              {typeof answer === "number" ? answer : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-[color:var(--text-quaternary)]">
            <span>1 · Strongly disagree</span>
            <span>5 · Strongly agree</span>
          </div>
          <div className="flex gap-1 pt-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(q.id, v)}
                aria-label={`Rate ${v}`}
                className="flex-1 rounded-lg border border-[color:var(--border-primary)] py-2 text-sm font-bold transition hover:bg-[color:var(--bg-secondary)]"
                style={{
                  background:
                    answer === v
                      ? "linear-gradient(135deg, var(--brand-peach), var(--brand-blue))"
                      : undefined,
                  color: answer === v ? "white" : undefined,
                  borderColor: answer === v ? "transparent" : undefined,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {q.type === "SINGLE" && (
        <RadioGroup
          value={typeof answer === "string" ? answer : ""}
          onValueChange={(v) => onChange(q.id, v)}
          className="space-y-2"
        >
          {(q.options ?? []).map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--border-primary)] px-4 py-2.5 hover:bg-[color:var(--bg-secondary)]"
            >
              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </RadioGroup>
      )}

      {q.type === "MULTI" && (
        <div className="space-y-2">
          {(q.options ?? []).map((opt) => {
            const selected = Array.isArray(answer) ? answer.includes(opt) : false;
            return (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[color:var(--border-primary)] px-4 py-2.5 hover:bg-[color:var(--bg-secondary)]"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={(v) => onToggleMulti(q.id, opt, !!v)}
                  id={`${q.id}-${opt}`}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === "TEXT" && (
        <Textarea
          placeholder="Share your thoughts… (optional)"
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onChange(q.id, e.target.value)}
          rows={3}
        />
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--color-error-500)]">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Acknowledgements tab ─────────────────────────────────────────────────────

interface AcksTabProps {
  evals: Evaluation[];
  acks: Acknowledgement[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onAcknowledge: (evaluationId: string) => void;
  supervisorName: (id: string) => string;
}

function AcknowledgementsTab({
  evals,
  acks,
  loading,
  error,
  onReload,
  onAcknowledge,
  supervisorName,
}: AcksTabProps) {
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ackFor = (evaluationId: string) => acks.find((a) => a.evaluationId === evaluationId);

  if (loading) {
    return (
      <div className="space-y-2 pt-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
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
        <button onClick={onReload} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]">
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
        const ack = ackFor(ev.id);
        const isExpanded = expandedId === ev.id;
        const isDeemedAck = !!ack?.deemedAt && !ack.acknowledgedAt;
        const isAcknowledged = !!ack?.acknowledgedAt;

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
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {ev.period} · Performance evaluation
                  </p>
                  {isAcknowledged && (
                    <Badge variant="success">Acknowledged</Badge>
                  )}
                  {isDeemedAck && (
                    <Badge variant="warning">Deemed acknowledged</Badge>
                  )}
                  {!isAcknowledged && !isDeemedAck && (
                    <Badge variant="neutral">Pending</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                  From {supervisorName(ev.supervisorId)} · Shared {ev.sharedAt ? new Date(ev.sharedAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <span className="text-xs text-[color:var(--text-quaternary)]">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-[color:var(--border-primary)] px-5 pb-5 pt-4">
                {/* Ratings */}
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {ev.ratings.map((r) => (
                    <div
                      key={r.competency}
                      className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-center"
                    >
                      <p className="text-lg font-bold text-[color:var(--text-primary)]">{r.score}<span className="text-xs text-[color:var(--text-quaternary)]">/5</span></p>
                      <p className="text-[11px] text-[color:var(--text-tertiary)]">{r.competency}</p>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mb-4 rounded-lg bg-[color:var(--bg-secondary)] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">Summary</p>
                  <p className="mt-1 text-sm leading-relaxed text-[color:var(--text-primary)]">{ev.summary}</p>
                </div>

                {/* Ack action */}
                {!isAcknowledged && !isDeemedAck && (
                  <Button onClick={() => setAckingId(ev.id)}>
                    <CheckCircle2 size={14} className="mr-1" />
                    Acknowledge
                  </Button>
                )}
                {isDeemedAck && (
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Deemed acknowledged on {new Date(ack!.deemedAt!).toLocaleDateString()} — no action needed.
                  </p>
                )}
                {isAcknowledged && (
                  <p className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)]">
                    <CheckCircle2 size={12} className="text-green-600" />
                    Acknowledged on {new Date(ack!.acknowledgedAt!).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Acknowledge confirm */}
      <AlertDialog open={!!ackingId} onOpenChange={(o) => !o && setAckingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge this evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              By acknowledging, you confirm you have read and understood your performance evaluation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (ackingId) onAcknowledge(ackingId);
                setAckingId(null);
                toast.success("Evaluation acknowledged.");
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

  const { survey, alreadyAnswered, loading: surveyLoading, error: surveyError, reload: reloadSurvey } =
    useActiveSurvey(employeeId);

  const { evals, acks, loading: evalLoading, error: evalError, reload: reloadEvals, acknowledge } =
    useMyEvaluations(employeeId);

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (alreadyAnswered) setSubmitted(true);
    else setSubmitted(false);
  }, [alreadyAnswered]);

  const handleSubmitted = () => {
    setSubmitted(true);
    reloadSurvey();
  };

  // Look up supervisor names for evaluations (read once from mock on mount)
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  useEffect(() => {
    setEmployees(readCollection<DemoEmployee>("employees"));
  }, []);
  const supervisorName = useCallback(
    (id: string) => employees.find((e) => e.employeeId === id)?.displayName ?? id,
    [employees],
  );

  const pendingAcks = evals.filter((ev) => {
    const ack = acks.find((a) => a.evaluationId === ev.id);
    return !ack?.acknowledgedAt && !ack?.deemedAt;
  }).length;

  return (
    <div>
      <PageHeader
        level="page"
        title="Surveys & acknowledgements"
        subtitle="Answer active pulse surveys and acknowledge your performance evaluations."
      />

      <Tabs defaultValue="survey">
        <TabsList>
          <TabsTrigger value="survey">Pulse survey</TabsTrigger>
          <TabsTrigger value="acknowledgements">
            Evaluations{pendingAcks > 0 ? ` (${pendingAcks})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* ── Pulse survey tab ── */}
        <TabsContent value="survey" className="mt-5">
          {surveyLoading && (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5">
                  <div className="h-4 w-48 rounded bg-[color:var(--bg-tertiary)]" />
                  <div className="mt-2 h-3 w-64 rounded bg-[color:var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          )}

          {!surveyLoading && surveyError && (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
              <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{surveyError}</span>
              <button
                onClick={() => void reloadSurvey()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!surveyLoading && !surveyError && !survey && (
            <EmptyState
              icon={ClipboardList}
              title="No active survey"
              body="There is no pulse survey open right now. Check back later."
            />
          )}

          {!surveyLoading && !surveyError && survey && (submitted || alreadyAnswered) && (
            <div
              className="flex flex-col items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white py-14 text-center"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <CheckCircle2 size={32} className="text-green-500" />
              <h2 className="text-base font-bold text-[color:var(--text-primary)]">Response submitted ✦</h2>
              <p className="text-sm text-[color:var(--text-tertiary)]">
                You have already responded to <strong>{survey.title}</strong>. Thank you!
              </p>
            </div>
          )}

          {!surveyLoading && !surveyError && survey && !submitted && !alreadyAnswered && (
            <SurveyTaker
              survey={survey}
              employeeId={employeeId}
              onSubmitted={handleSubmitted}
            />
          )}
        </TabsContent>

        {/* ── Acknowledgements tab ── */}
        <TabsContent value="acknowledgements">
          <AcknowledgementsTab
            evals={evals}
            acks={acks}
            loading={evalLoading}
            error={evalError}
            onReload={reloadEvals}
            onAcknowledge={acknowledge}
            supervisorName={supervisorName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
