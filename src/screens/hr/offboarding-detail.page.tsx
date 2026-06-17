"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle, XCircle, RotateCcw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Separator,
  StatusBadge,
  EmptyState,
  ConfirmProvider,
  useConfirm,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
  FormField,
} from "@/shared/ui";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { OffboardingCase, DemoEmployee, Clearance } from "@/shared/mock/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── inner component (needs ConfirmProvider in tree) ──────────────────────────

function OffboardingDetailInner() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<{ caseId: string; deptIdx: number } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectNoteError, setRejectNoteError] = useState(false);

  // Supervisor reassignment state
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);

  // Re-render trigger — we read from localStorage directly on each render
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const confirm = useConfirm();

  // Derive data on every render (so mutations are reflected immediately)
  const { offCase, employee, employees } = useMemo(() => {
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const emps = readCollection<DemoEmployee>("employees");
    const found = cases.find((c) => c.id === id) ?? null;
    const emp = found ? (emps.find((e) => e.employeeId === found.employeeId) ?? null) : null;
    return { offCase: found, employee: emp, employees: emps };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tick]);

  // ── not found ────────────────────────────────────────────────────────────────
  if (!offCase || !employee) {
    return (
      <div>
        <PageHeader title="Offboarding" />
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <EmptyState
            icon={LogOut}
            title="Case not found"
            body="This offboarding case does not exist or has been removed."
            action={{ label: "Back to offboarding", onClick: () => router.push("/hr/offboarding") }}
          />
        </div>
      </div>
    );
  }

  // ── helpers for mutations ────────────────────────────────────────────────────

  function updateClearance(
    caseId: string,
    deptIdx: number,
    patch: Partial<Clearance>,
  ) {
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const updated = cases.map((c) => {
      if (c.id !== caseId) return c;
      const newClearances = c.clearances.map((cl, i) =>
        i === deptIdx ? { ...cl, ...patch } : cl,
      );

      // Auto-complete: if all clearances signed, close the case
      const allSigned = newClearances.every((cl) => cl.status === "SIGNED");
      const newStatus: OffboardingCase["status"] = allSigned ? "COMPLETE" : c.status;

      return { ...c, clearances: newClearances, status: newStatus };
    });
    writeCollection<OffboardingCase>("offboardingCases", updated);

    // If auto-complete triggered, also mark employee INACTIVE
    const afterCase = updated.find((c) => c.id === caseId)!;
    if (afterCase.status === "COMPLETE") {
      const emps = readCollection<DemoEmployee>("employees");
      const updatedEmps = emps.map((e) =>
        e.employeeId === afterCase.employeeId
          ? { ...e, employeeStatus: "INACTIVE" as const, isActive: false }
          : e,
      );
      writeCollection<DemoEmployee>("employees", updatedEmps);
      toast.success("Offboarding complete — employee marked inactive.");
    }
  }

  // ── sign handler ─────────────────────────────────────────────────────────────

  function handleSign(deptIdx: number, signNote?: string) {
    updateClearance(offCase!.id, deptIdx, { status: "SIGNED", note: signNote ?? undefined });
    refresh();
    toast.success("Clearance signed.");
  }

  // ── reject handler ───────────────────────────────────────────────────────────

  function openRejectDialog(deptIdx: number) {
    setRejectTarget({ caseId: offCase!.id, deptIdx });
    setRejectNote("");
    setRejectNoteError(false);
  }

  function handleRejectSubmit() {
    if (!rejectNote.trim()) {
      setRejectNoteError(true);
      return;
    }
    if (!rejectTarget) return;
    updateClearance(rejectTarget.caseId, rejectTarget.deptIdx, {
      status: "REJECTED",
      note: rejectNote.trim(),
    });
    setRejectTarget(null);
    setRejectNote("");
    refresh();
    toast.error("Clearance rejected — HR notified.");
  }

  // ── reset handler ────────────────────────────────────────────────────────────

  async function handleReset(deptIdx: number) {
    const ok = await confirm({
      title: "Reset clearance to pending?",
      description:
        "This will allow the clearance owner to sign or reject again. Are you sure?",
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    updateClearance(offCase!.id, deptIdx, { status: "PENDING", note: undefined });
    refresh();
    toast.success("Clearance reset to pending.");
  }

  // ── supervisor reassignment ──────────────────────────────────────────────────

  function handleReassign() {
    if (!newSupervisorId) return;
    setReassigning(true);
    const emps = readCollection<DemoEmployee>("employees");
    const updated = emps.map((e) =>
      e.supervisorId === employee!.employeeId
        ? { ...e, supervisorId: newSupervisorId }
        : e,
    );
    writeCollection<DemoEmployee>("employees", updated);
    setReassigning(false);
    toast.success("Direct reports reassigned.");
  }

  // ── active employees for reassignment select ─────────────────────────────────
  const activeEmployees = employees.filter(
    (e) =>
      e.isActive &&
      e.employeeId !== employee.employeeId &&
      e.employeeStatus !== "OFFBOARDING" &&
      e.employeeStatus !== "INACTIVE",
  );

  // ── employee map for owner names ─────────────────────────────────────────────
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));

  return (
    <div>
      {/* Breadcrumb */}
      <p className="mb-2 text-xs text-[color:var(--text-tertiary)]">
        <span
          className="cursor-pointer hover:underline"
          onClick={() => router.push("/hr")}
        >
          HR
        </span>
        {" › "}
        <span
          className="cursor-pointer hover:underline"
          onClick={() => router.push("/hr/offboarding")}
        >
          Offboarding
        </span>
        {" › "}
        <span className="font-medium text-[color:var(--text-secondary)]">
          {employee.displayName}
        </span>
      </p>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {initials(employee.displayName)}
          </span>
          <div>
            <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-[color:var(--text-primary)]">
              {employee.displayName}
            </h1>
            <p className="text-sm text-[color:var(--text-tertiary)]">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
        </div>
        <StatusBadge status={offCase.status} />
      </div>

      {/* Meta card */}
      <div
        className="mb-6 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Last Day
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {formatDate(offCase.lastDay)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Reason
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {offCase.reason}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Clearances
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {offCase.clearances.filter((cl) => cl.status === "SIGNED").length}/
              {offCase.clearances.length} signed
            </p>
          </div>
        </div>
      </div>

      {/* Clearances section */}
      <div
        className="mb-6 rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Clearances
          </p>
        </div>
        <Separator />
        <ul className="divide-y divide-[color:var(--border-primary)]">
          {offCase.clearances.map((cl, idx) => {
            const owner = empMap.get(cl.ownerEmployeeId);
            return (
              <li key={idx} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">
                      {cl.dept}
                    </span>
                    <StatusBadge status={cl.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                    Owner: {owner?.displayName ?? cl.ownerEmployeeId}
                  </p>
                  {cl.note && (
                    <p className="mt-1 text-xs italic text-[color:var(--text-tertiary)]">
                      Note: {cl.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cl.status === "PENDING" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSign(idx)}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Sign
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openRejectDialog(idx)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {cl.status === "REJECTED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleReset(idx)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Supervisor reassignment section */}
      {employee.isSupervisor && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Supervisor Reassignment
          </p>
          <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
            {employee.displayName} is a supervisor. Reassign their direct reports before
            offboarding completes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField label="New supervisor" className="flex-1">
              <Select value={newSupervisorId} onValueChange={setNewSupervisorId}>
                <SelectTrigger aria-label="Select new supervisor">
                  <SelectValue placeholder="Choose a supervisor…" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.employeeId} value={e.employeeId}>
                      {e.displayName} — {e.jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button
              onClick={handleReassign}
              disabled={!newSupervisorId || reassigning}
              className="flex-shrink-0"
            >
              Reassign direct reports
            </Button>
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectNote("");
            setRejectNoteError(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject clearance</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This note will be visible to HR.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <FormField
              label="Rejection note"
              required
              error={rejectNoteError ? "A rejection note is required." : undefined}
            >
              <Textarea
                value={rejectNote}
                onChange={(e) => {
                  setRejectNote(e.target.value);
                  if (e.target.value.trim()) setRejectNoteError(false);
                }}
                placeholder="Describe why this clearance is being rejected…"
                rows={3}
              />
            </FormField>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRejectTarget(null);
                setRejectNote("");
                setRejectNoteError(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>
              Confirm rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── page export (wraps with ConfirmProvider) ─────────────────────────────────

export default function OffboardingDetailPage() {
  return (
    <ConfirmProvider>
      <OffboardingDetailInner />
    </ConfirmProvider>
  );
}
