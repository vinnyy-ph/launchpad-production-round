"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection } from "@/shared/mock/db";
import type { Survey, SurveyResponse } from "@/shared/mock/types";

export function UnansweredSurveyBanner() {
  const { appUser } = useAuth();
  const [surveyTitle, setSurveyTitle] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!appUser?.employeeId) return;
    const active = readCollection<Survey>("surveys").find((s) => s.status === "ACTIVE") ?? null;
    if (!active) {
      setSurveyTitle(null);
      return;
    }
    const alreadyAnswered = readCollection<SurveyResponse>("surveyResponses").some(
      (r) => r.surveyId === active.id && r.employeeId === appUser.employeeId,
    );
    setSurveyTitle(alreadyAnswered ? null : active.title);
    if (!alreadyAnswered) setDismissed(false);
  }, [appUser?.employeeId]);

  if (!surveyTitle || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-6 py-2.5"
    >
      <ClipboardList
        size={15}
        className="flex-shrink-0 text-[color:var(--text-secondary)]"
        aria-hidden="true"
      />
      <p className="flex-1 text-[13px] font-medium text-[color:var(--text-secondary)]">
        Active survey: <span className="font-semibold text-[color:var(--text-primary)]">{surveyTitle}</span> — your response has not been submitted yet.{" "}
        <Link
          href="/employee/surveys"
          className="font-semibold text-[color:var(--text-primary)] underline-offset-2 hover:underline"
        >
          Take survey
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded p-0.5 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
