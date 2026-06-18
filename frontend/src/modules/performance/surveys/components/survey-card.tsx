"use client";

import { Button } from "@/shared/ui";
import { ClipboardList } from "lucide-react";
import type { PendingSurvey } from "../types/surveys.types";

/** A pending pulse in the employee's answer list. */
export function SurveyCard({ survey, onTake }: { survey: PendingSurvey; onTake: () => void }) {
  const questionCount = survey.questions.length;
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="flex-shrink-0 text-[color:var(--text-quaternary)]" />
          <h3 className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
            {survey.surveyName}
          </h3>
        </div>
        <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
          {questionCount} {questionCount === 1 ? "question" : "questions"} · Due{" "}
          {new Date(survey.deadline).toLocaleDateString()}
        </p>
      </div>
      <Button size="sm" onClick={onTake}>
        Take survey
      </Button>
    </div>
  );
}
