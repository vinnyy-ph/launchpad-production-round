"use client";

import { ShieldCheck, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
  Skeleton,
} from "@/shared/ui";
import { useMyAnswers } from "../hooks/use-my-answers";
import type { AnsweredSurvey, MyAnswer } from "../types/surveys.types";

const NOT_ANSWERED = (
  <p className="text-sm italic text-[color:var(--text-quaternary)]">Not answered</p>
);

/** Renders one answer for a question, read-only, per type. Shared by the employee's own-answers
 *  view and the authority-gated individual drill-down. */
export function AnswerValue({ a }: { a: MyAnswer }) {
  switch (a.type) {
    case "SHORT_ANSWER":
    case "LONG_ANSWER":
      return a.answerText?.trim() ? (
        <p className="whitespace-pre-wrap text-sm text-[color:var(--text-primary)]">
          {a.answerText}
        </p>
      ) : (
        NOT_ANSWERED
      );

    case "LINEAR_SCALE": {
      if (typeof a.answerData !== "number") return NOT_ANSWERED;
      const scale =
        a.scaleMin != null && a.scaleMax != null ? ` of ${a.scaleMin}–${a.scaleMax}` : "";
      const labels = [a.scaleMinLabel, a.scaleMaxLabel].filter(Boolean).join(" → ");
      return (
        <p className="text-sm text-[color:var(--text-primary)]">
          <span className="font-semibold">{a.answerData}</span>
          <span className="text-[color:var(--text-tertiary)]">{scale}</span>
          {labels ? (
            <span className="text-[color:var(--text-quaternary)]"> ({labels})</span>
          ) : null}
        </p>
      );
    }

    case "MULTIPLE_CHOICE":
      return typeof a.answerData === "string" && a.answerData ? (
        <span className="inline-flex rounded-md bg-[color:var(--bg-secondary)] px-2.5 py-1 text-sm text-[color:var(--text-primary)]">
          {a.answerData}
        </span>
      ) : (
        NOT_ANSWERED
      );

    case "CHECKBOX":
      return Array.isArray(a.answerData) && a.answerData.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {a.answerData.map((opt) => (
            <span
              key={opt}
              className="inline-flex rounded-md bg-[color:var(--bg-secondary)] px-2.5 py-1 text-sm text-[color:var(--text-primary)]"
            >
              {opt}
            </span>
          ))}
        </div>
      ) : (
        NOT_ANSWERED
      );

    default:
      return NOT_ANSWERED;
  }
}

export interface MyAnswersDialogProps {
  open: boolean;
  /** The answered-list row that was clicked — gives an instant title before the fetch lands. */
  answered: AnsweredSurvey | null;
  onClose: () => void;
}

/** Read-only view of the employee's own past pulse answers (PER-23). */
export function MyAnswersDialog({ open, answered, onClose }: MyAnswersDialogProps) {
  const { data, isLoading, isError, refetch } = useMyAnswers(open ? answered?.occurrenceId ?? null : null);

  if (!answered) return null;

  // Prefer the fetched flag once it lands; fall back to the row for an instant, flicker-free header.
  const isAnonymous = data?.isAnonymous ?? answered.isAnonymous;
  const surveyName = data?.surveyName ?? answered.surveyName;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6 text-left">
          <div className="flex flex-wrap items-center gap-2.5">
            <DialogTitle className="text-xl font-bold tracking-tight">{surveyName}</DialogTitle>
            <Badge variant={isAnonymous ? "brand" : "modern"} pill>
              {isAnonymous ? "Anonymous" : "Named"}
            </Badge>
          </div>
          <DialogDescription>
            {answered.occurrenceNumber > 1 ? `Round ${answered.occurrenceNumber} · ` : ""}Your
            responses
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-4">
          {isLoading && (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
              <AlertCircle
                size={16}
                className="flex-shrink-0 text-[color:var(--color-error-500)]"
              />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
                Could not load your answers.
              </span>
              <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          )}

          {data && !data.submitted && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3 text-[14px] text-[color:var(--text-secondary)]">
              <AlertCircle
                size={17}
                className="mt-0.5 flex-none text-[color:var(--text-tertiary)]"
                aria-hidden="true"
              />
              <span>You haven&apos;t responded to this pulse yet.</span>
            </div>
          )}

          {data && data.submitted && isAnonymous && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[color:var(--color-success-200)] bg-[color:var(--color-success-50)] px-4 py-3 text-[14px] text-[color:var(--color-success-700)]">
              <ShieldCheck size={17} className="mt-0.5 flex-none" aria-hidden="true" />
              <span>
                This pulse was anonymous. To protect anonymity, your answers aren&apos;t linked
                to you — so they can&apos;t be shown back here. Others only ever see aggregates.
              </span>
            </div>
          )}

          {data &&
            data.submitted &&
            !isAnonymous &&
            data.answers.map((a) => (
              <div key={a.questionId}>
                <p className="mb-1.5 text-sm font-semibold text-[color:var(--text-primary)]">
                  {a.questionText}
                </p>
                <AnswerValue a={a} />
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
