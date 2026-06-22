"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { RotateCcw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePageBreadcrumb } from "@/shared/components/layout/breadcrumb-context";
import {
  Button,
  Separator,
  StatusBadge,
  EmptyState,
  ErrorState,
  ConfirmProvider,
  useConfirm,
  Combobox,
  FormField,
  Skeleton,
} from "@/shared/ui";
import {
  useOffboarding,
  useReassignOffboarding,
  useResetClearance,
} from "@/modules/people/offboarding";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import type { OffboardingDetail, SignatureRequest } from "@/modules/people/offboarding";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

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

// ─── loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5" style={{ boxShadow: "var(--shadow-xs)" }}>
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[color:var(--border-primary)] last:border-0">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── inner component (needs ConfirmProvider in tree) ──────────────────────────

function OffboardingDetailInner() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const { offboarding, loading, error, reload } = useOffboarding(id);
  const { reset, resetting } = useResetClearance();
  const confirm = useConfirm();

  // Topbar breadcrumb: Organization › People › Offboarding › {employee}.
  usePageBreadcrumb(offboarding ? [fullName(offboarding.employee)] : []);

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) return <DetailSkeleton />;

  // ── load error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4">
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  // ── not found ─────────────────────────────────────────────────────────────
  if (!offboarding) {
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
            action={{ label: "Back to offboarding", onClick: () => router.push("/hr/directory/offboarding") }}
          />
        </div>
      </div>
    );
  }

  const employee = offboarding.employee;
  const employeeName = fullName(employee);
  const requests = offboarding.signatureRequests;
  const signed = requests.filter((r) => r.status === "SIGNED").length;

  async function handleReset(req: SignatureRequest) {
    const ok = await confirm({
      title: `Reset clearance: ${req.purpose}?`,
      description:
        "This returns the request to pending so the signatory can sign or reject again. Are you sure?",
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    try {
      await reset(req.id);
      toast.success("Clearance reset to pending.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset clearance.");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {initials(employeeName)}
          </span>
          <div>
            <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-[color:var(--text-primary)]">
              {employeeName}
            </h1>
            <p className="text-sm text-[color:var(--text-tertiary)]">
              {employee.jobTitle ?? "—"}
              {employee.department ? ` · ${employee.department}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={offboarding.status} />
      </div>

      {/* Meta card */}
      <div
        className="mb-6 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Tender date
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {formatDate(offboarding.tenderDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Effective date
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {formatDate(offboarding.effectiveDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Initiated by
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {fullName(offboarding.initiatedBy)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Clearances
            </p>
            <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">
              {signed}/{requests.length} signed
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
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-[color:var(--text-tertiary)]">
            No clearance requests on this case.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--border-primary)]">
            {requests.map((req) => (
              <li key={req.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">
                      {req.purpose}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                    Signatory: {fullName(req.signatory)}
                  </p>
                  {req.requirements && (
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                      {req.requirements}
                    </p>
                  )}
                  {req.note && (
                    <p className="mt-1 text-xs italic text-[color:var(--text-tertiary)]">
                      Note: {req.note}
                    </p>
                  )}
                </div>
                {req.status !== "PENDING" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resetting}
                      onClick={() => void handleReset(req)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Supervisor reassignment (only meaningful while the case is open) */}
      {offboarding.status === "IN_PROGRESS" && (
        <ReassignSection offboarding={offboarding} />
      )}
    </div>
  );
}

// ─── reassignment section ─────────────────────────────────────────────────────

function ReassignSection({ offboarding }: { offboarding: OffboardingDetail }) {
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const { reassign, reassigning } = useReassignOffboarding(offboarding.id);
  const { employees } = useEmployees({ status: "active", limit: 200 });

  const options = employees
    .filter((e) => e.id !== offboarding.employee.id)
    .map((e) => ({ value: e.id, label: `${e.fullName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}` }));

  async function handleReassign() {
    if (!newSupervisorId) return;
    try {
      const result = await reassign(newSupervisorId);
      toast.success(
        `Reassigned ${result.reassignedReports} report(s) and ${result.reassignedTeams} team(s).`,
      );
      setNewSupervisorId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reassign.");
    }
  }

  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        Supervisor reassignment
      </p>
      <p className="mb-4 text-sm text-[color:var(--text-secondary)]">
        Move this employee&apos;s direct reports and any teams they lead to another supervisor.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField label="New supervisor" className="flex-1">
          <Combobox
            options={options}
            value={newSupervisorId}
            onChange={(v) => setNewSupervisorId(v)}
            placeholder="Choose a supervisor…"
            searchPlaceholder="Search employees…"
            emptyText="No employees available."
          />
        </FormField>
        <Button
          onClick={() => void handleReassign()}
          disabled={!newSupervisorId || reassigning}
          className="flex-shrink-0"
        >
          {reassigning ? "Reassigning…" : "Reassign reports"}
        </Button>
      </div>
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
