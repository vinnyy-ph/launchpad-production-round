"use client";

import { useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Input,
  Progress,
  Separator,
} from "@/shared/ui";
import { EmptyState, StatusBadge } from "@/shared/ui/patterns";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type {
  OnboardingCase,
  DemoEmployee,
  OnboardingDocument,
  DocStatus,
} from "@/shared/mock/types";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function allDocsApproved(docs: OnboardingDocument[]): boolean {
  return docs.length > 0 && docs.every((d) => d.status === "APPROVED");
}

function allFieldsFilled(fields: { label: string; value: string }[]): boolean {
  return fields.length > 0 && fields.every((f) => f.value.trim() !== "" && f.value.trim() !== "—");
}

function DocStatusIcon({ status }: { status: DocStatus }) {
  if (status === "APPROVED")
    return <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-label="Approved" />;
  if (status === "REJECTED")
    return <XCircle className="h-4 w-4 text-[#B42318]" aria-label="Rejected" />;
  return <Clock className="h-4 w-4 text-[color:var(--text-quaternary)]" aria-label="Pending" />;
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function OnboardingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(() => {
    const cases = readCollection<OnboardingCase>("onboardingCases");
    return cases.find((c) => c.id === id) ?? null;
  });

  const employee = useMemo<DemoEmployee | null>(() => {
    if (!onboardingCase) return null;
    const employees = readCollection<DemoEmployee>("employees");
    return employees.find((e) => e.employeeId === onboardingCase.employeeId) ?? null;
  }, [onboardingCase]);

  // ── auto-complete check ──────────────────────────────────────────────────
  function maybeComplete(updated: OnboardingCase): OnboardingCase {
    if (
      updated.status !== "COMPLETE" &&
      allDocsApproved(updated.documents) &&
      allFieldsFilled(updated.customFields)
    ) {
      // promote employee to ACTIVE
      const employees = readCollection<DemoEmployee>("employees");
      const updatedEmployees = employees.map((e) =>
        e.employeeId === updated.employeeId ? { ...e, employeeStatus: "ACTIVE" as const } : e,
      );
      writeCollection<DemoEmployee>("employees", updatedEmployees);

      toast.success("Onboarding complete — employee is now Active.");
      return { ...updated, status: "COMPLETE", progress: 100 };
    }
    return updated;
  }

  // ── persist helper ───────────────────────────────────────────────────────
  function persist(updated: OnboardingCase) {
    const checked = maybeComplete(updated);
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const next = cases.map((c) => (c.id === checked.id ? checked : c));
    writeCollection<OnboardingCase>("onboardingCases", next);
    setOnboardingCase(checked);
  }

  // ── document actions ─────────────────────────────────────────────────────
  function handleDocAction(docName: string, action: "APPROVED" | "REJECTED") {
    if (!onboardingCase) return;
    const updatedDocs = onboardingCase.documents.map((d) =>
      d.name === docName ? { ...d, status: action as DocStatus } : d,
    );
    const label = action === "APPROVED" ? "approved" : "rejected";
    toast.success(`"${docName}" ${label}.`);
    persist({ ...onboardingCase, documents: updatedDocs });
  }

  // ── custom field edit ────────────────────────────────────────────────────
  function handleFieldChange(idx: number, value: string) {
    if (!onboardingCase) return;
    const updatedFields = onboardingCase.customFields.map((f, i) =>
      i === idx ? { ...f, value } : f,
    );
    const updated = { ...onboardingCase, customFields: updatedFields };
    persist(updated);
  }

  // ── send invite ──────────────────────────────────────────────────────────
  function handleSendInvite() {
    if (!onboardingCase) return;
    const updated = { ...onboardingCase, invitedAt: new Date().toISOString() };
    persist(updated);
    toast.success("Invitation sent.");
  }

  // ── bulk upload ──────────────────────────────────────────────────────────
  function handleFileSelect() {
    toast.success("Bulk upload received — processing.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─── render guards ──────────────────────────────────────────────────────

  // Not found
  if (onboardingCase === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          icon={ClipboardList}
          title="Case not found"
          body="This onboarding case does not exist or has been removed."
          action={{ label: "Back to Onboarding", onClick: () => router.push("/hr/onboarding") }}
        />
      </div>
    );
  }

  const { status, progress, customFields, documents, invitedAt } = onboardingCase;
  const employeeName = employee?.displayName ?? "Unknown Employee";
  const canSendInvite = status === "INVITED" || status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-[color:var(--text-tertiary)]" aria-label="Breadcrumb">
        <button
          onClick={() => router.push("/hr/onboarding")}
          className="hover:text-[color:var(--text-primary)] transition-colors"
        >
          HR
        </button>
        <span className="mx-1">›</span>
        <button
          onClick={() => router.push("/hr/onboarding")}
          className="hover:text-[color:var(--text-primary)] transition-colors"
        >
          Onboarding
        </button>
        <span className="mx-1">›</span>
        <span className="text-[color:var(--text-secondary)]">{employeeName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <PageHeader
            level="page"
            title={employeeName}
            subtitle={`Invited ${formatDate(invitedAt)}`}
          />
          <div className="flex items-center gap-3 -mt-4">
            <StatusBadge status={status} dot />
            <div className="flex flex-1 max-w-[240px] items-center gap-2">
              <Progress value={progress} className="flex-1" />
              <span className="text-xs text-[color:var(--text-tertiary)]">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {canSendInvite && (
            <Button variant="outline" onClick={handleSendInvite}>
              Send invite
            </Button>
          )}
          {/* Bulk upload */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload .xlsx
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            aria-label="Upload .xlsx file"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Custom Fields */}
      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Custom fields"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Custom Fields
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          {customFields.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No custom fields defined.
            </p>
          ) : (
            customFields.map((field, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <label
                  htmlFor={`field-${idx}`}
                  className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-40 sm:flex-shrink-0"
                >
                  {field.label}
                </label>
                <Input
                  id={`field-${idx}`}
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, e.target.value)}
                  className="flex-1"
                  disabled={status === "COMPLETE"}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Documents */}
      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Documents"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Documents
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          {documents.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No documents requested.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.name}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <DocStatusIcon status={doc.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">
                      {doc.name}
                    </p>
                    <StatusBadge status={doc.status} shape="pill" />
                  </div>
                </div>

                {/* HR approve / reject actions — only for SUBMITTED docs */}
                {doc.status !== "APPROVED" && doc.status !== "REJECTED" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#067647] border-[#ABEFC6] hover:bg-[#ECFDF3]"
                      onClick={() => handleDocAction(doc.name, "APPROVED")}
                      disabled={doc.status === "PENDING"}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#B42318] border-[#FECDCA] hover:bg-[#FEF3F2]"
                      onClick={() => handleDocAction(doc.name, "REJECTED")}
                      disabled={doc.status === "PENDING"}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Already decided */}
                {doc.status === "APPROVED" && (
                  <span className="text-xs font-medium text-[#067647]">Approved</span>
                )}
                {doc.status === "REJECTED" && (
                  <span className="text-xs font-medium text-[#B42318]">Rejected</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
