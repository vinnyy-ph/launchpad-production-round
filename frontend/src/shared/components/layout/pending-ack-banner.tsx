"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEvaluations } from "@/modules/performance/evaluations/hooks/use-evaluations";

export function PendingAckBanner() {
  const { appUser } = useAuth();
  const { data } = useEvaluations();
  const [dismissed, setDismissed] = useState(false);

  const employeeId = appUser?.employeeId;
  const count = employeeId
    ? (data ?? []).filter(
        (e) =>
          e.isSent &&
          e.revieweeId === employeeId &&
          !e.acknowledgement?.acknowledgedAt &&
          !e.acknowledgement?.isDeemedAck,
      ).length
    : 0;

  // Re-show the banner when a new pending evaluation arrives after a dismissal.
  const prevCount = useRef(0);
  useEffect(() => {
    if (count > prevCount.current) setDismissed(false);
    prevCount.current = count;
  }, [count]);

  if (count === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-50)] px-6 py-2.5"
    >
      <AlertTriangle
        size={15}
        className="flex-shrink-0 text-[color:var(--color-warning-600)]"
        aria-hidden="true"
      />
      <p className="flex-1 text-[14px] font-medium text-[color:var(--color-warning-700)]">
        You have {count} performance evaluation{count > 1 ? "s" : ""} waiting for your acknowledgement.{" "}
        <Link
          href="/employee/surveys?tab=acknowledgements"
          className="font-semibold text-[color:var(--color-warning-700)] underline-offset-2 hover:underline"
        >
          Review now
        </Link>
      </p>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
      >
        <X />
      </Button>
    </div>
  );
}
