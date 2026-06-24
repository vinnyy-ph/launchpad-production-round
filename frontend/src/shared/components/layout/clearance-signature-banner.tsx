"use client";

import { useState } from "react";
import Link from "next/link";
import { PenLine, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useAssignedClearances } from "@/modules/people/offboarding";

export function ClearanceSignatureBanner() {
  const { appUser } = useAuth();
  const { clearances } = useAssignedClearances(Boolean(appUser?.employeeId));
  const [dismissed, setDismissed] = useState(false);

  const count = clearances.filter((c) => c.status === "PENDING").length;

  if (count === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-[color:var(--color-warning-200)] bg-[color:var(--color-warning-100)] px-6 py-2.5"
    >
      <PenLine
        size={15}
        className="flex-shrink-0 text-[color:var(--color-warning-600)]"
        aria-hidden="true"
      />
      <p className="flex-1 text-[14px] font-medium text-[color:var(--color-warning-700)]">
        You have {count} clearance{count > 1 ? "s" : ""} awaiting your signature.{" "}
        <Link
          href="/employee/clearance"
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
