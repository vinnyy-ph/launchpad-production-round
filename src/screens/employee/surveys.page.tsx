"use client";

import { useState, useCallback, useEffect } from "react";
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
  AudienceType,
} from "@/shared/mock/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const GRADE_LABELS: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs improvement",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Exceptional",
};

// ─── Audience filtering ───────────────────────────────────────────────────────

function employeeSeessurvey(survey: Survey, employee: DemoEmployee): boolean {
  const audience: AudienceType = survey.audienceType ?? "EVERYONE";

  if (audience === "EVERYONE") return true;

  if (audience === "SUPERVISOR_BASED") {
    const targetId = survey.audienceSupervisorId;
    if (!targetId) return false;
    // Include if this employee IS the supervisor target, or if this employee reports to that supervisor
    return (
      employee.employeeId === targetId ||
      employee.supervisorId === targetId
    );
  }

  if (audience === "SPECIFIC_TEAMS") {
    const teamIds = survey.audienceTeamIds ?? [];
    return employee.teamId !== null && teamIds.includes(employee.teamId);
  }

  return false;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

interface ActiveSurveyEntry {
  survey: Survey;
  alreadyAnswered: boolean;
}

function useActiveSurveys(employeeId: string) {
  const [entries, setEntries] = useState<ActiveSurveyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const employees = readCollection<DemoEmployee>("employees");
      const employee = employees.find(
        (e) => e.employeeId === employeeId && e.employeeStatus === "ACTIVE",
      );

      if (!employee) {
        setEntries([]);
        return;
      }

      const surveys = readCollection<Survey>("surveys");
      const responses = readCollection<SurveyResponse>("surveyResponses");

      const active = surveys.filter(
        (s) => s.status === "ACTIVE" && employeeSeessurvey(s, employee),
      );

      const result: ActiveSurveyEntry[] = active.map((s) => ({
        survey: s,
        alreadyAnswered: responses.some(
          (r) => r.surveyId === s.id && r.employeeId === employeeId,
        ),
      }));

      setEntries(result);
    } catch {
      setError("Could not load surveys.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, error, reload: load };
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
        (e) =>
          e.employeeId === employeeId &&
          (e.status === "SHARED" ||
            e.status === "ACKNOWLEDGED" ||
            e.status === "DEEMED_ACKNOWLEDGED"),
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

  useEffect(() => {
    load();
  }, [load]);

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

      const allEvals = readCollection<Evaluation>("evaluations");
      writeCollection(
        "evaluations",
        allEvals.map((e) =>
          e.id === evaluationId ? { ...e, status: "ACKNOWLEDGED" as const } : e,
        ),
      );

      setAcks(updated.filter((a) => a.employeeId === employeeId));
      setEvals((prev) =>
        prev.map((e) =>
          e.id === evaluationId ? { ...e, status: "ACKNOWLEDGED" as const } : e,
        ),
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
  onCancel?: () => void;
}

function SurveyTaker({ survey, employeeId, onSubmitted, onCancel }: SurveyTakerProps) {
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
      if (!q.required) return;
      const ans = answers[q.id];
      if (ans === undefined || ans === "" || (Array.isArray(ans) && ans.length === 0)) {
        errs[q.id] = "Please answer this question.";
      }
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[color:var(--text-primary)]">{survey.title}</h2>
            {survey.description && (
              <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{survey.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {survey.audience && <Badge variant="neutral">{survey.audience}</Badge>}
              {survey.anonymous && <Badge variant="success">Anonymous</Badge>}
              {survey.deadline && (
                <Badge variant="neutral">
                  Due {new Date(survey.deadline).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
            >
              Cancel
            </button>
          )}
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
        Q{idx + 1}{q.required && <span className="ml-1 text-[color:var(--color-error-500)]">*</span>}
      </p>
      <p className="mb-4 text-sm font-medium text-[color:var(--text-primary)]">{q.prompt}</p>

      {q.type === "RATING" && (() => {
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        const currentVal = typeof answer === "number" ? answer : undefined;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Slider
                min={min}
                max={max}
                step={1}
                value={[currentVal ?? min]}
                onValueChange={([v]) => onChange(q.id, v)}
                className="flex-1"
              />
              <span className="w-6 text-center text-base font-bold text-[color:var(--text-primary)]">
                {currentVal !== undefined ? currentVal : "—"}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-[color:var(--text-quaternary)]">
              <span>{q.scaleMinLabel ?? String(min)}</span>
              <span>{q.scaleMaxLabel ?? String(max)}</span>
            </div>
            <div className="flex gap-1 pt-1">
              {steps.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange(q.id, v)}
                  aria-label={`Rate ${v}`}
                  className={[
                    "flex-1 rounded-lg border py-2 text-sm font-bold transition",
                    answer === v
                      ? "border-transparent bg-[color:var(--gray-neutral-900)] text-white"
                      : "border-[color:var(--border-primary)] hover:bg-[color:var(--bg-secondary)]",
                  ].join(" ")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

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
              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} aria-label={opt} />
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
                  aria-label={opt}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === "TEXT" &&
        (q.multiline ? (
          <Textarea
            placeholder={q.required ? "Your answer…" : "Share your thoughts… (optional)"}
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => onChange(q.id, e.target.value)}
            rows={4}
            maxLength={q.maxChars}
          />
        ) : (
          <input
            type="text"
            placeholder={q.required ? "Your answer…" : "Share your thoughts… (optional)"}
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => onChange(q.id, e.target.value)}
            maxLength={q.maxChars}
            className="w-full rounded-lg border border-[color:var(--border-primary)] bg-white px-3 py-2 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)]"
          />
        ))}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--color-error-500)]">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Survey list (Pulse surveys tab) ─────────────────────────────────────────

interface SurveysTabProps {
  entries: ActiveSurveyEntry[];
  employeeId: string;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

function SurveysTab({ entries, employeeId, loading, error, onReload }: SurveysTabProps) {
  const [takingId, setTakingId] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const handleSubmitted = (surveyId: string) => {
    setSubmittedIds((prev) => new Set(prev).add(surveyId));
    setTakingId(null);
  };

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

  if (entries.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={ClipboardList}
          title="No active surveys"
          body="There are no pulse surveys open for you right now. Check back later."
        />
      </div>
    );
  }

  // If currently taking a survey, show only that survey taker
  if (takingId) {
    const entry = entries.find((e) => e.survey.id === takingId);
    if (entry) {
      return (
        <div className="pt-4">
          <SurveyTaker
            survey={entry.survey}
            employeeId={employeeId}
            onSubmitted={() => handleSubmitted(takingId)}
            onCancel={() => setTakingId(null)}
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-3 pt-4">
      {entries.map(({ survey, alreadyAnswered }) => {
        const isDone = alreadyAnswered || submittedIds.has(survey.id);

        return (
          <div
            key={survey.id}
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {survey.title}
                  </h3>
                  {survey.anonymous && <Badge variant="success">Anonymous</Badge>}
                  {isDone && <Badge variant="success">Submitted</Badge>}
                </div>
                {survey.description && (
                  <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
                    {survey.description}
                  </p>
                )}
                {survey.deadline && (
                  <p className="mt-1 text-xs text-[color:var(--text-quaternary)]">
                    Due {new Date(survey.deadline).toLocaleDateString()}
                  </p>
                )}
              </div>

              {isDone ? (
                <div className="flex items-center gap-1.5 text-sm text-[color:var(--text-tertiary)]">
                  <CheckCircle2 size={15} className="text-green-500" />
                  Response submitted ✦
                </div>
              ) : (
                <Button size="sm" onClick={() => setTakingId(survey.id)}>
                  Take survey
                </Button>
              )}
            </div>
          </div>
        );
      })}
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
        const ack = ackFor(ev.id);
        const isExpanded = expandedId === ev.id;
        const isDeemedAck =
          ev.status === "DEEMED_ACKNOWLEDGED" || (!!ack?.deemedAt && !ack?.acknowledgedAt);
        const isAcknowledged = ev.status === "ACKNOWLEDGED" || !!ack?.acknowledgedAt;

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
                    {ev.period} · Performance evaluation
                  </p>
                  {isAcknowledged && <Badge variant="success">Acknowledged</Badge>}
                  {!isAcknowledged && isDeemedAck && (
                    <Badge variant="warning">Deemed acknowledged</Badge>
                  )}
                  {!isAcknowledged && !isDeemedAck && <Badge variant="neutral">Pending</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                  From {supervisorName(ev.supervisorId)} · Shared{" "}
                  {ev.sharedAt ? new Date(ev.sharedAt).toLocaleDateString() : "—"}
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
                {ev.evaluationText && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Evaluation
                    </p>
                    <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {ev.evaluationText}
                    </p>
                  </div>
                )}

                {/* Recommendation text */}
                {ev.recommendationText && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Recommendation
                    </p>
                    <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {ev.recommendationText}
                    </p>
                  </div>
                )}

                {/* Supporting docs */}
                {ev.supportingDocs && ev.supportingDocs.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Supporting documents
                    </p>
                    <ul className="space-y-1">
                      {ev.supportingDocs.map((doc, i) => (
                        <li key={i} className="text-sm text-[color:var(--text-secondary)]">
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ack action */}
                {!isAcknowledged && isDeemedAck && (
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    Deemed acknowledged on{" "}
                    {ack?.deemedAt
                      ? new Date(ack.deemedAt).toLocaleDateString()
                      : ev.ackDeadline
                      ? new Date(ev.ackDeadline).toLocaleDateString()
                      : "—"}{" "}
                    — no action needed.
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

  const { entries, loading: surveyLoading, error: surveyError, reload: reloadSurveys } =
    useActiveSurveys(employeeId);

  const {
    evals,
    acks,
    loading: evalLoading,
    error: evalError,
    reload: reloadEvals,
    acknowledge,
  } = useMyEvaluations(employeeId);

  const [employees, setEmployees] = useState<DemoEmployee[]>([]);
  useEffect(() => {
    setEmployees(readCollection<DemoEmployee>("employees"));
  }, []);

  const supervisorName = useCallback(
    (id: string) => employees.find((e) => e.employeeId === id)?.displayName ?? id,
    [employees],
  );

  const pendingAcks = evals.filter((ev) => {
    if (ev.status === "ACKNOWLEDGED" || ev.status === "DEEMED_ACKNOWLEDGED") return false;
    const ack = acks.find((a) => a.evaluationId === ev.id);
    return !ack?.acknowledgedAt && !ack?.deemedAt;
  }).length;

  const unansweredCount = entries.filter((e) => !e.alreadyAnswered).length;

  return (
    <div>
      <PageHeader
        level="page"
        title="Surveys & acknowledgements"
        subtitle="Answer active pulse surveys and acknowledge your performance evaluations."
      />

      <Tabs defaultValue="survey">
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
            entries={entries}
            employeeId={employeeId}
            loading={surveyLoading}
            error={surveyError}
            onReload={reloadSurveys}
          />
        </TabsContent>

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
