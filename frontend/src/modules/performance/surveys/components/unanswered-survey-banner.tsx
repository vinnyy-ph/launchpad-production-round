"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { useMySurveys } from "../hooks/use-my-surveys";

/**
 * App-wide pinned banner shown while the signed-in employee has pulse surveys to answer.
 * Clicking lands directly on the first pending pulse's answer screen (click-to-land).
 */
export function UnansweredSurveyBanner() {
  const { data } = useMySurveys();
  const pending = data ?? [];
  const count = pending.length;
  const [dismissed, setDismissed] = useState(false);

  // Re-show after dismissal when a new pulse arrives.
  const prevCount = useRef(0);
  useEffect(() => {
    if (count > prevCount.current) setDismissed(false);
    prevCount.current = count;
  }, [count]);

  if (count === 0 || dismissed) return null;

  const first = pending[0];
  const href = `/employee/surveys?tab=survey&pulse=${first.occurrenceId}`;

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
        You have {count} pulse survey{count > 1 ? "s" : ""} waiting for your response.{" "}
        <Link
          href={href}
          className="font-semibold text-[color:var(--text-primary)] underline-offset-2 hover:underline"
        >
          Answer now
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
