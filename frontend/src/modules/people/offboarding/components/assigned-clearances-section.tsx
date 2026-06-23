"use client";

import { useState } from "react";
import { FileCheck, CheckCircle2, XCircle } from "lucide-react";
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
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
} from "@/shared/ui";

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
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Clearances awaiting the signed-in employee's signature: sign (with a confirmation step and
 * optional note) or reject (required note). Self-contained — owns its data fetch, the sign and
 * reject dialogs, and every state. Callers provide the surrounding heading.
 */
export function AssignedClearancesSection() {
  const { appUser } = useAuth();
  const { clearances, loading, error, reload } = useAssignedClearances(Boolean(appUser?.employeeId));
  const { sign, signing } = useSignClearance();
  const { reject, rejecting } = useRejectClearance();

  // Sign confirmation dialog state (optional note per the clearance spec).
  const [signTarget, setSignTarget] = useState<AssignedClearance | null>(null);
  const [signNote, setSignNote] = useState("");

  // Reject dialog state (note required).
  const [rejectTarget, setRejectTarget] = useState<AssignedClearance | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  function surfaceCompletion(action: ClearanceAction) {
    if (action.offboardingCompleted || action.employeeInactivated) {
      toast.success("Offboarding complete — employee deactivated.");
    }
  }

  function openSign(item: AssignedClearance) {
    setSignTarget(item);
    setSignNote("");
  }

  async function handleSignConfirm() {
    if (!signTarget) return;
    const item = signTarget;
    const note = signNote.trim();
    try {
      const action = await sign({ requestId: item.requestId, note: note || undefined });
      toast.success(`${item.purpose} clearance signed for ${fullName(item.offboardee)}.`);
      setSignTarget(null);
      setSignNote("");
      surfaceCompletion(action);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign clearance.");
    }
  }

  function openReject(item: AssignedClearance) {
    setRejectTarget(item);
    setRejectNote("");
  }

  async function handleRejectConfirm() {
    if (!rejectTarget || !rejectNote.trim()) return;
    try {
      await reject({ requestId: rejectTarget.requestId, note: rejectNote.trim() });
      toast.success(`${rejectTarget.purpose} clearance rejected.`);
      setRejectTarget(null);
      setRejectNote("");
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
                    <Button size="sm" disabled={signing} onClick={() => openSign(item)}>
                      <CheckCircle2 size={14} className="mr-1" />
                      Sign
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openReject(item)}>
                      <XCircle size={14} className="mr-1" />
                      Reject
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

      {/* Sign confirmation dialog — confirm before signing, with an optional short note. */}
      <Dialog open={!!signTarget} onOpenChange={(open) => !open && setSignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign clearance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[color:var(--text-secondary)]">
            You&apos;re about to sign the <strong>{signTarget?.purpose}</strong> clearance for{" "}
            <strong>{signTarget ? fullName(signTarget.offboardee) : ""}</strong>. This confirms you
            have completed the required checks.
          </p>
          <Textarea
            placeholder="Add a note (optional)"
            value={signNote}
            onChange={(e) => setSignNote(e.target.value)}
            rows={3}
            className="mt-1"
          />
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => setSignTarget(null)} disabled={signing}>
              Cancel
            </Button>
            <Button onClick={() => void handleSignConfirm()} disabled={signing}>
              <CheckCircle2 size={14} className="mr-1" />
              Confirm &amp; sign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog — a note is required. */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject clearance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Provide a reason for rejecting the{" "}
            <strong>{rejectTarget?.purpose}</strong> clearance for{" "}
            <strong>{rejectTarget ? fullName(rejectTarget.offboardee) : ""}</strong>.
          </p>
          <Textarea
            placeholder="Rejection reason (required)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className="mt-1"
          />
          {rejectNote.trim() === "" && rejectTarget && (
            <p className="text-xs text-[color:var(--color-error-500)]">A reason is required to reject.</p>
          )}
          <DialogFooter className="mt-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectConfirm()}
              disabled={rejectNote.trim() === "" || rejecting}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
