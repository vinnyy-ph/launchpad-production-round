"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PenLine, X } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection } from "@/shared/mock/db";
import type { OffboardingCase } from "@/shared/mock/types";

export function ClearanceSignatureBanner() {
  const { appUser } = useAuth();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!appUser?.employeeId) return;
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const pending = cases.reduce(
      (n, c) =>
        n +
        c.clearances.filter(
          (cl) => cl.ownerEmployeeId === appUser.employeeId && cl.status === "PENDING",
        ).length,
      0,
    );
    setCount(pending);
    if (pending > 0) setDismissed(false);
  }, [appUser?.employeeId]);

  if (count === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-6 py-2.5"
    >
      <PenLine
        size={15}
        className="flex-shrink-0 text-[color:var(--text-secondary)]"
        aria-hidden="true"
      />
      <p className="flex-1 text-[13px] font-medium text-[color:var(--text-secondary)]">
        You have {count} clearance{count > 1 ? "s" : ""} awaiting your signature.{" "}
        <Link
          href="/employee/clearance"
          className="font-semibold text-[color:var(--text-primary)] underline-offset-2 hover:underline"
        >
          Review now
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
