"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { Button } from "@/shared/ui";
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
      className="flex items-center gap-3 border-b border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-6 py-2.5"
    >
      <ClipboardList
        size={15}
        className="flex-shrink-0 text-[color:var(--color-warning-600)]"
        aria-hidden="true"
      />
      <p className="flex-1 text-[14px] font-medium text-[color:var(--color-warning-700)]">
        You have {count} pulse survey{count > 1 ? "s" : ""} waiting for your response.{" "}
        <Link
          href={href}
          className="rounded-sm font-semibold text-[color:var(--color-warning-700)] underline-offset-2 hover:underline"
        >
          Answer now
        </Link>
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0"
      >
        <X />
      </Button>
    </div>
  );
}
