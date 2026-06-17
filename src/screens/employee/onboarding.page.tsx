import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  PartyPopper,
} from "lucide-react";

import { readCollection, writeCollection } from "@/shared/mock/db";
import type { OnboardingCase, OnboardingCustomField, DocStatus } from "@/shared/mock/types";
import { useAuth } from "@/modules/auth/hooks/use-auth";

import { PageHeader } from "@/shared/components/layout/page-header";
import { ProgressBar } from "@/shared/ui/patterns/progress-bar";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { PageSection } from "@/shared/ui/patterns/page-section";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

// ─── Skeleton placeholder shown during initial load ──────────────────────────

function OnboardingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[6px] w-full rounded-[10px]" />
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({
  name,
  status,
  onUpload,
  onReupload,
}: {
  name: string;
  status: DocStatus;
  onUpload: () => void;
  onReupload: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[color:var(--border-primary)] py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
        <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">{name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={status} />
        {status === "PENDING" && (
          <Button size="sm" variant="secondary" onClick={onUpload}>
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        )}
        {status === "SUBMITTED" && (
          <span className="text-xs text-[color:var(--text-tertiary)]">Awaiting review</span>
        )}
        {status === "APPROVED" && (
          <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-hidden="true" />
        )}
        {status === "REJECTED" && (
          <Button size="sm" variant="destructive" onClick={onReupload}>
            <Upload className="h-3.5 w-3.5" />
            Re-upload
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeOnboardingPage() {
  const { appUser } = useAuth();

  // undefined = loading, null = not found / error, OnboardingCase = found
  const [obCase, setObCase] = useState<OnboardingCase | null | undefined>(undefined);
  const [fields, setFields] = useState<OnboardingCustomField[]>([]);
  const [loadError, setLoadError] = useState(false);

  function loadCase() {
    setLoadError(false);
    setObCase(undefined);
    try {
      const cases = readCollection<OnboardingCase>("onboardingCases");
      const found = cases.find((c) => c.employeeId === appUser?.employeeId) ?? null;
      setObCase(found);
      if (found) setFields(found.customFields);
    } catch {
      setLoadError(true);
      setObCase(null);
    }
  }

  useEffect(() => {
    loadCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.employeeId]);

  // ── Save custom fields ────────────────────────────────────────────────────

  function handleSaveFields() {
    if (!obCase) return;
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const updated = cases.map((c) =>
      c.id === obCase.id ? { ...c, customFields: fields } : c,
    );
    writeCollection<OnboardingCase>("onboardingCases", updated);
    setObCase((prev) => (prev ? { ...prev, customFields: fields } : prev));
    toast.success("Profile info saved");
  }

  // ── Upload / re-upload a document ─────────────────────────────────────────

  function handleDocAction(docName: string, newStatus: DocStatus) {
    if (!obCase) return;
    const nextDocs = obCase.documents.map((d) =>
      d.name === docName ? { ...d, status: newStatus } : d,
    );
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const updated = cases.map((c) =>
      c.id === obCase.id ? { ...c, documents: nextDocs } : c,
    );
    writeCollection<OnboardingCase>("onboardingCases", updated);
    setObCase((prev) => (prev ? { ...prev, documents: nextDocs } : prev));
    toast.success("Document submitted");
  }

  // ── Render states ─────────────────────────────────────────────────────────

  if (obCase === undefined) {
    return (
      <div className="p-6">
        <PageHeader title="My onboarding" subtitle="Track your onboarding tasks and documents." />
        <OnboardingSkeleton />
      </div>
    );
  }

  if (loadError || obCase === null || obCase.status === "COMPLETE") {
    return (
      <div className="p-6">
        <PageHeader title="My onboarding" subtitle="Track your onboarding tasks and documents." />
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <EmptyState
            icon={loadError ? AlertCircle : CheckCircle2}
            title={loadError ? "Could not load onboarding data" : "All done!"}
            body={
              loadError
                ? "Something went wrong while loading your onboarding case."
                : "Your onboarding is complete or hasn't started yet."
            }
            action={
              loadError
                ? { label: "Retry", onClick: loadCase }
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  // ── Active case ───────────────────────────────────────────────────────────

  const { documents, status } = obCase;

  return (
    <div className="p-6">
      <PageHeader
        title="My onboarding"
        subtitle="Complete all tasks and documents to finish your onboarding."
        action={<StatusBadge status={status} />}
      />

      <div className="mb-6 rounded-xl border border-[color:var(--border-primary)] bg-white px-6 py-4" style={{ boxShadow: "var(--shadow-xs)" }}>
        <ProgressBar
          value={obCase.progress}
          label="Onboarding progress"
          counter={`${obCase.progress}%`}
        />
      </div>

      {/* Custom fields */}
      <PageSection title="Profile information" description="Fill in your details and save when done.">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {fields.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="No fields to fill"
              body="Your HR team hasn't added any custom fields yet."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field, idx) => {
                  const fieldId = `custom-field-${idx}`;
                  return (
                    <FormField key={idx} label={field.label} htmlFor={fieldId}>
                      <Input
                        id={fieldId}
                        value={field.value}
                        onChange={(e) => {
                          const next = [...fields];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setFields(next);
                        }}
                      />
                    </FormField>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSaveFields}>Save changes</Button>
              </div>
            </>
          )}
        </div>
      </PageSection>

      {/* Documents */}
      <PageSection title="Documents" description="Upload required documents for HR review.">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white px-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents required"
              body="Your HR team hasn't added any required documents."
            />
          ) : (
            <div>
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.name}
                  name={doc.name}
                  status={doc.status}
                  onUpload={() => handleDocAction(doc.name, "SUBMITTED")}
                  onReupload={() => handleDocAction(doc.name, "SUBMITTED")}
                />
              ))}
            </div>
          )}
        </div>
      </PageSection>
    </div>
  );
}
