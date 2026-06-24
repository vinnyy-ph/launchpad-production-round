"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@/shared/ui";
import { QuestionField, type AnswerValue } from "./questions/question-field";
import { useSubmitResponse } from "../hooks/use-submit-response";
import type { PendingSurvey, AnswerInput, Question } from "../types/surveys.types";

// Per-type "gentle nudge" for an unanswered required question.
function requiredNudge(type: Question["type"]): string {
  switch (type) {
    case "LINEAR_SCALE":
      return "Please pick a number.";
    case "MULTIPLE_CHOICE":
      return "Please choose one.";
    case "CHECKBOX":
      return "Please choose at least one.";
    default:
      return "Please answer this question.";
  }
}

/** Build the wire payload for one question from its in-form value, or null when an
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

export interface TakeSurveyDialogProps {
  open: boolean;
  survey: PendingSurvey | null;
  onClose: () => void;
  /** Called after a successful submit (e.g. to refresh the pending list). */
  onSubmitted: () => void;
}

export function TakeSurveyDialog({ open, survey, onClose, onSubmitted }: TakeSurveyDialogProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showFormError, setShowFormError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submit = useSubmitResponse();

  // Reset the form each time the dialog opens (or the survey changes).
  useEffect(() => {
    if (open) {
      setAnswers({});
      setErrors({});
      setShowFormError(false);
      setSubmitted(false);
    }
  }, [open, survey?.occurrenceId]);

  if (!survey) return null;

  const isAnonymous = survey.isAnonymous;
  const requiredCount = survey.questions.filter((q) => q.isRequired).length;

  const setAnswer = (qid: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
    setErrors((prev) => {
      if (!prev[qid]) return prev;
      const next = { ...prev };
      delete next[qid];
      return next;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    for (const q of survey.questions) {
      if (!q.isRequired) continue;
      const a = answers[q.id];
      const empty = a === undefined || a === "" || (Array.isArray(a) && a.length === 0);
      if (empty) errs[q.id] = requiredNudge(q.type);
    }
    setErrors(errs);
    setShowFormError(Object.keys(errs).length > 0);
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
        onSuccess: () => setSubmitted(true),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const handleDone = () => {
    onSubmitted();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {submitted ? (
          // ── Thank-you state ──
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-success-50)] text-[color:var(--color-success-600)]">
              <CheckCircle2 size={28} />
            </span>
            <h2 className="mt-4 text-xl font-bold text-[color:var(--text-primary)]">
              Thanks for sharing!
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[color:var(--text-tertiary)]">
              Your response is recorded.
              {isAnonymous
                ? " Since this pulse is anonymous, your answers are never tied back to you."
                : ""}
            </p>
            <Button className="mt-6" onClick={handleDone}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6 text-left">
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {survey.surveyName}
                </DialogTitle>
                {isAnonymous ? (
                  <Badge variant="brand" pill>
                    Anonymous
                  </Badge>
                ) : (
                  <Badge variant="modern" pill>
                    Named
                  </Badge>
                )}
              </div>
              <DialogDescription>
                {survey.questions.length}{" "}
                {survey.questions.length === 1 ? "question" : "questions"} · Due{" "}
                {new Date(survey.deadline).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-4">
              {/* Anonymity reassurance line */}
              <div
                className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[14px] ${
                  isAnonymous
                    ? "border-[#C7D7FE] bg-[#EEF4FF] text-[#3538CD]"
                    : "border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)]"
                }`}
              >
                {isAnonymous ? (
                  <ShieldCheck size={17} className="mt-0.5 flex-none" aria-hidden="true" />
                ) : (
                  <Users size={17} className="mt-0.5 flex-none" aria-hidden="true" />
                )}
                <span>
                  {isAnonymous
                    ? "Your answers are anonymous. Your name is never attached to them."
                    : "Your name is attached to this response, so your team can follow up."}
                </span>
              </div>

              {showFormError && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-error-500)]">
                  <AlertCircle size={14} /> Please answer the required questions.
                </p>
              )}

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
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border-primary)] px-6 py-3.5">
              <span className="text-[14px] text-[color:var(--text-tertiary)]">
                {requiredCount > 0
                  ? `${requiredCount} required ${requiredCount === 1 ? "question" : "questions"}`
                  : "All questions optional"}
              </span>
              <Button onClick={handleSubmit} disabled={submit.isPending}>
                {submit.isPending ? "Submitting…" : "Submit response"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
