"use client";

import { useState } from "react";
import { FileCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import {
  useAssignedClearances,
  useSignClearance,
  useRejectClearance,
} from "../hooks/use-sign-clearance";
import type { AssignedClearance, ClearanceAction } from "../types/offboarding.types";
import { EmptyState, ErrorState, StatusBadge, PageSection } from "@/shared/ui/patterns";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { Button } from "@/shared/ui";
import { ClearanceReviewModal } from "./clearance-review-modal";

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-[color:var(--border-primary)] last:border-0">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Clearances awaiting the signed-in employee's signature. Each pending row opens a review
 * modal showing the offboardee's details and uploaded documents, from which the signatory
 * signs (required signature + optional note) or rejects (required note). Self-contained —
 * owns its data fetch, the review modal, and every state. Callers provide the surrounding heading.
 */
export function AssignedClearancesSection() {
  const { appUser } = useAuth();
  const { clearances, loading, error, reload } = useAssignedClearances(Boolean(appUser?.employeeId));
  const { sign, signing } = useSignClearance();
  const { reject, rejecting } = useRejectClearance();

  // The clearance currently open in the review modal (null when closed).
  const [reviewTarget, setReviewTarget] = useState<AssignedClearance | null>(null);

  function surfaceCompletion(action: ClearanceAction) {
    if (action.employeeInactivated) {
      toast.success("Offboarding complete — employee deactivated.");
    } else if (action.offboardingCompleted) {
      // All signatures are in, but the employee stays active until the effective date.
      toast.success("Clearance complete — employee deactivates on the effective date.");
    }
  }

  async function handleSign(signatureImage: string, note?: string) {
    if (!reviewTarget) return;
    const item = reviewTarget;
    try {
      const action = await sign({ requestId: item.requestId, signatureImage, note });
      toast.success(`${item.purpose} clearance signed for ${fullName(item.offboardee)}.`);
      setReviewTarget(null);
      surfaceCompletion(action);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign clearance.");
    }
  }

  async function handleReject(note: string) {
    if (!reviewTarget) return;
    const item = reviewTarget;
    try {
      await reject({ requestId: item.requestId, note });
      toast.success(`${item.purpose} clearance rejected.`);
      setReviewTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reject clearance.");
    }
  }

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  const pending = clearances.filter((i) => i.status === "PENDING");
  const resolved = clearances.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      {clearances.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No clearances pending"
          body="You have no offboarding clearances to sign at this time."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <div
              className="rounded-xl border border-[color:var(--border-primary)] bg-white overflow-hidden"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <ul className="divide-y divide-[color:var(--border-primary)]">
                {pending.map((item) => (
                  <li key={item.requestId} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">
                        {item.purpose} — {fullName(item.offboardee)}
                      </p>
                      <p className="text-xs text-[color:var(--text-secondary)]">
                        {item.requirements ?? "Department clearance"}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setReviewTarget(item)}>
                      <Eye size={14} className="mr-1" />
                      Review
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolved.length > 0 && (
            <PageSection title="Resolved">
              <div
                className="rounded-xl border border-[color:var(--border-primary)] bg-white overflow-hidden"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <ul className="divide-y divide-[color:var(--border-primary)]">
                  {resolved.map((item) => (
                    <li key={item.requestId} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {item.purpose} — {fullName(item.offboardee)}
                        </p>
                        {item.status === "REJECTED" && item.note && (
                          <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                            Note: {item.note}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </PageSection>
          )}
        </>
      )}

      <ClearanceReviewModal
        clearance={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSign={handleSign}
        onReject={handleReject}
        signing={signing}
        rejecting={rejecting}
      />
    </div>
  );
}
