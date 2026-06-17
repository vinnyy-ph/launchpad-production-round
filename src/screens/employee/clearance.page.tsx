import { useState, useEffect } from "react";
import { FileCheck, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { OffboardingCase, DemoEmployee, Clearance } from "@/shared/mock/types";
import { EmptyState, StatusBadge, PageSection } from "@/shared/ui/patterns";
import { PageHeader } from "@/shared/components/layout/page-header";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingClearanceItem {
  caseId: string;
  employeeId: string;
  employeeName: string;
  dept: string;
  clearanceIndex: number;
  status: Clearance["status"];
  note?: string;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
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
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClearancePage() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<PendingClearanceItem[] | undefined>(undefined);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<PendingClearanceItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  function loadItems() {
    try {
      const cases = readCollection<OffboardingCase>("offboardingCases");
      const emps = readCollection<DemoEmployee>("employees");
      const myId = appUser?.employeeId;

      const result: PendingClearanceItem[] = [];
      for (const c of cases) {
        c.clearances.forEach((cl, idx) => {
          if (cl.ownerEmployeeId === myId) {
            const emp = emps.find((e) => e.employeeId === c.employeeId);
            result.push({
              caseId: c.id,
              employeeId: c.employeeId,
              employeeName: emp?.displayName ?? c.employeeId,
              dept: cl.dept,
              clearanceIndex: idx,
              status: cl.status,
              note: cl.note,
            });
          }
        });
      }
      setItems(result);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.employeeId]);

  function updateClearance(caseId: string, clearanceIndex: number, patch: Partial<Clearance>) {
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const updated = cases.map((c) => {
      if (c.id !== caseId) return c;
      return {
        ...c,
        clearances: c.clearances.map((cl, i) => (i === clearanceIndex ? { ...cl, ...patch } : cl)),
      };
    });
    writeCollection("offboardingCases", updated);
    setItems((prev) =>
      prev?.map((item) =>
        item.caseId === caseId && item.clearanceIndex === clearanceIndex
          ? { ...item, ...patch }
          : item,
      ),
    );
  }

  function handleSign(item: PendingClearanceItem) {
    updateClearance(item.caseId, item.clearanceIndex, { status: "SIGNED" });
    toast.success(`${item.dept} clearance signed for ${item.employeeName}`);
  }

  function openReject(item: PendingClearanceItem) {
    setRejectTarget(item);
    setRejectNote("");
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) return; // require a note — validated in dialog
    updateClearance(rejectTarget.caseId, rejectTarget.clearanceIndex, {
      status: "REJECTED",
      note: rejectNote.trim(),
    });
    toast.success(`${rejectTarget.dept} clearance rejected`);
    setRejectTarget(null);
    setRejectNote("");
  }

  if (items === undefined) return <LoadingSkeleton />;

  const pending = items.filter((i) => i.status === "PENDING");
  const resolved = items.filter((i) => i.status !== "PENDING");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Clearances awaiting me"
        subtitle="Offboarding clearances that require your signature."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No clearances pending"
          body="You have no offboarding clearances to sign at this time."
        />
      ) : (
        <>
          {pending.length > 0 && (
            <PageSection title="Pending signature">
              <div
                className="rounded-xl border border-[color:var(--border-primary)] bg-white overflow-hidden"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <ul className="divide-y divide-[color:var(--border-primary)]">
                  {pending.map((item) => (
                    <li key={`${item.caseId}-${item.clearanceIndex}`} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {item.dept} — {item.employeeName}
                        </p>
                        <p className="text-xs text-[color:var(--text-secondary)]">
                          Department clearance
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleSign(item)}>
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
            </PageSection>
          )}

          {resolved.length > 0 && (
            <PageSection title="Resolved">
              <div
                className="rounded-xl border border-[color:var(--border-primary)] bg-white overflow-hidden"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <ul className="divide-y divide-[color:var(--border-primary)]">
                  {resolved.map((item) => (
                    <li key={`${item.caseId}-${item.clearanceIndex}`} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">
                          {item.dept} — {item.employeeName}
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

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject clearance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Provide a reason for rejecting the{" "}
            <strong>{rejectTarget?.dept}</strong> clearance for{" "}
            <strong>{rejectTarget?.employeeName}</strong>.
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
              onClick={handleRejectConfirm}
              disabled={rejectNote.trim() === ""}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
