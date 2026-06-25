"use client";

import { useEffect, useState } from "react";
import { Button, Badge } from "@/shared/ui";
import { ClipboardList, CalendarClock, ArrowRight } from "lucide-react";
import type { PendingSurvey } from "../types/surveys.types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A pending pulse in the employee's answer list. */
export function SurveyCard({ survey, onTake }: { survey: PendingSurvey; onTake: () => void }) {
  const questionCount = survey.questions.length;

  // Deadline urgency is derived after mount so the server-prerendered markup and the client
  // hydration agree — the clock only exists on the client.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const daysLeft =
    now != null ? Math.ceil((new Date(survey.deadline).getTime() - now) / 86_400_000) : null;
  const dueSoon = daysLeft != null && daysLeft >= 0 && daysLeft <= 3;

  const dueLabel =
    daysLeft === 0
      ? "Due today"
      : dueSoon
        ? `Due in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`
        : `Due ${formatDate(survey.deadline)}`;

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 transition-colors hover:border-[color:var(--border-secondary)] sm:flex-row sm:items-center sm:justify-between"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[color:var(--bg-secondary)]">
          <ClipboardList size={18} className="text-[color:var(--text-secondary)]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
            {survey.surveyName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="modern" size="sm" pill>
              {questionCount} {questionCount === 1 ? "question" : "questions"}
            </Badge>
            <Badge variant={dueSoon ? "warning" : "modern"} size="sm" pill>
              <CalendarClock size={11} aria-hidden="true" />
              {dueLabel}
            </Badge>
            <Badge variant={survey.isAnonymous ? "brand" : "modern"} size="sm" pill>
              {survey.isAnonymous ? "Anonymous" : "Named"}
            </Badge>
          </div>
        </div>
      </div>
      <Button size="sm" onClick={onTake} className="w-full sm:w-auto sm:flex-none">
        Take survey
        <ArrowRight size={15} aria-hidden="true" />
      </Button>
    </div>
  );
}
