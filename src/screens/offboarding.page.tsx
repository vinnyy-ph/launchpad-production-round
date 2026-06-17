import { useState, useEffect } from "react";
import { DoorOpen, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection } from "@/shared/mock/db";
import type { OffboardingCase, DemoEmployee, ClearanceStatus } from "@/shared/mock/types";
import { EmptyState, StatusBadge, ProgressBar, PageSection } from "@/shared/ui/patterns";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

function signatoryName(ownerEmployeeId: string, employees: DemoEmployee[]): string {
  return employees.find((e) => e.employeeId === ownerEmployeeId)?.displayName ?? ownerEmployeeId;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ClearanceIcon({ status }: { status: ClearanceStatus }) {
  if (status === "SIGNED") return <CheckCircle2 size={16} className="text-[#067647]" aria-hidden="true" />;
  if (status === "REJECTED") return <XCircle size={16} className="text-[#B42318]" aria-hidden="true" />;
  return <Clock size={16} className="text-[color:var(--text-tertiary)]" aria-hidden="true" />;
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5" style={{ boxShadow: "var(--shadow-xs)" }}>
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-3 w-24 mb-4" />
        <Skeleton className="h-[6px] w-full rounded-full" />
      </div>
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--border-primary)] last:border-0">
            <Skeleton className="h-4 w-4 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OffboardingHubPage() {
  const { appUser } = useAuth();
  const [ofCase, setOfCase] = useState<OffboardingCase | null | undefined>(undefined);
  const [employees, setEmployees] = useState<DemoEmployee[]>([]);

  useEffect(() => {
    try {
      const cases = readCollection<OffboardingCase>("offboardingCases");
      const emps = readCollection<DemoEmployee>("employees");
      setOfCase(cases.find((c) => c.employeeId === appUser?.employeeId) ?? null);
      setEmployees(emps);
    } catch {
      setOfCase(null);
    }
  }, [appUser?.employeeId]);

  if (ofCase === undefined) return <LoadingSkeleton />;

  if (ofCase === null) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="No active offboarding"
        body="You have no offboarding or clearance tasks at this time."
      />
    );
  }

  const total = ofCase.clearances.length;
  const signed = ofCase.clearances.filter((c) => c.status === "SIGNED").length;
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Offboarding status" />

      {/* Status banner */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5 space-y-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-[color:var(--text-primary)]">
              Last day: {formatDate(ofCase.lastDay)}
            </p>
            <p className="text-sm text-[color:var(--text-secondary)]">{ofCase.reason}</p>
          </div>
          <StatusBadge status={ofCase.status} dot />
        </div>
        <ProgressBar
          value={pct}
          label="Clearance progress"
          counter={`${signed} of ${total} signed`}
        />
      </div>

      {/* Clearance checklist */}
      <PageSection title="Clearance checklist">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white overflow-hidden"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {ofCase.clearances.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[color:var(--text-tertiary)]">
              No clearance items.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--border-primary)]">
              {ofCase.clearances.map((cl, idx) => (
                <li key={idx} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex-shrink-0">
                    <ClearanceIcon status={cl.status} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{cl.dept}</p>
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      {signatoryName(cl.ownerEmployeeId, employees)}
                    </p>
                    {cl.status === "REJECTED" && cl.note && (
                      <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{cl.note}</p>
                    )}
                  </div>
                  <StatusBadge status={cl.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageSection>
    </div>
  );
}
