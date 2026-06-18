import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  PartyPopper,
} from "lucide-react";

import { readCollection, writeCollection } from "@/shared/mock/db";
import type {
  OnboardingCase,
  OnboardingCustomField,
  DocStatus,
  DemoEmployee,
} from "@/shared/mock/types";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { markEmployeeActive } from "@/modules/auth/stores/auth.store";

import { ProgressBar } from "@/shared/ui/patterns/progress-bar";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { PageSection } from "@/shared/ui/patterns/page-section";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

// ─── The wizard's four stages (drives the "Step N of M" indicator) ───────────

const STEPS = [
  "Review your details",
  "Complete your profile",
  "Upload your documents",
  "HR review & activation",
] as const;

// ─── Skeleton placeholder shown during initial load ──────────────────────────

function OnboardingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[88px] w-full rounded-xl" />
      <Skeleton className="h-[120px] w-full rounded-xl" />
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
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
                (done
                  ? "bg-[color:var(--gray-neutral-900)] text-white"
                  : active
                    ? "border-2 border-[color:var(--gray-neutral-900)] text-[color:var(--text-primary)]"
                    : "border border-[color:var(--border-secondary)] text-[color:var(--text-quaternary)]")
              }
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : n}
            </span>
            <span
              className={
                "text-[12px] " +
                (active
                  ? "font-bold text-[color:var(--text-primary)]"
                  : "font-medium text-[color:var(--text-tertiary)]")
              }
            >
              {label}
            </span>
            {n < STEPS.length && (
              <span className="mx-1 hidden h-px w-5 bg-[color:var(--border-secondary)] sm:block" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── "What's blocking activation" checklist row ──────────────────────────────

function ChecklistRow({
  state,
  label,
  detail,
}: {
  state: "done" | "todo" | "waiting";
  label: string;
  detail: string;
}) {
  const Icon = state === "done" ? CheckCircle2 : state === "waiting" ? Clock : Circle;
  const tint =
    state === "done"
      ? "text-[#067647]"
      : state === "waiting"
        ? "text-[color:var(--text-tertiary)]"
        : "text-[color:var(--text-quaternary)]";
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + tint} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">{label}</p>
        <p className="text-[12px] text-[color:var(--text-tertiary)]">{detail}</p>
      </div>
    </li>
  );
}

// ─── Read-only review row (HR pre-filled identity data) ──────────────────────

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-[color:var(--border-primary)] py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-[13px] font-medium text-[color:var(--text-primary)]">{value || "—"}</span>
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
  const router = useRouter();

  // undefined = loading, null = not found / error, OnboardingCase = found
  const [obCase, setObCase] = useState<OnboardingCase | null | undefined>(undefined);
  const [me, setMe] = useState<DemoEmployee | null>(null);
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [fields, setFields] = useState<OnboardingCustomField[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [activating, setActivating] = useState(false);

  function loadCase() {
    setLoadError(false);
    setObCase(undefined);
    try {
      const employees = readCollection<DemoEmployee>("employees");
      const meRow = employees.find((e) => e.employeeId === appUser?.employeeId) ?? null;
      const cases = readCollection<OnboardingCase>("onboardingCases");
      const found = cases.find((c) => c.employeeId === appUser?.employeeId) ?? null;
      setMe(meRow);
      setSupervisorName(
        employees.find((e) => e.employeeId === meRow?.supervisorId)?.displayName ?? "",
      );
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
    const updated = cases.map((c) => (c.id === obCase.id ? { ...c, customFields: fields } : c));
    writeCollection<OnboardingCase>("onboardingCases", updated);
    setObCase((prev) => (prev ? { ...prev, customFields: fields } : prev));
    toast.success("Profile details saved");
  }

  // ── Upload / re-upload a document ─────────────────────────────────────────

  function handleDocAction(docName: string, newStatus: DocStatus) {
    if (!obCase) return;
    const nextDocs = obCase.documents.map((d) =>
      d.name === docName ? { ...d, status: newStatus } : d,
    );
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const updated = cases.map((c) => (c.id === obCase.id ? { ...c, documents: nextDocs } : c));
    writeCollection<OnboardingCase>("onboardingCases", updated);
    setObCase((prev) => (prev ? { ...prev, documents: nextDocs } : prev));
    toast.success("Document submitted for review");
  }

  // ── Activate (demo shortcut for HR approval) ──────────────────────────────

  function handleActivate() {
    if (!obCase || !appUser) return;
    setActivating(true);

    // Approve every document + close out the onboarding case.
    const approvedDocs = obCase.documents.map((d) => ({ ...d, status: "APPROVED" as DocStatus }));
    const cases = readCollection<OnboardingCase>("onboardingCases");
    writeCollection<OnboardingCase>(
      "onboardingCases",
      cases.map((c) =>
        c.id === obCase.id
          ? { ...c, status: "COMPLETE", progress: 100, documents: approvedDocs }
          : c,
      ),
    );

    // Flip the employee to Active (persisted) + in-session (releases the gate).
    const employees = readCollection<DemoEmployee>("employees");
    writeCollection<DemoEmployee>(
      "employees",
      employees.map((e) =>
        e.employeeId === appUser.employeeId
          ? { ...e, employeeStatus: "ACTIVE", isActive: true }
          : e,
      ),
    );
    markEmployeeActive();

    toast.success("You're all set — welcome to SwiftWork!");
    router.replace("/");
  }

  // ── Render: loading / error / empty ───────────────────────────────────────

  if (obCase === undefined) {
    return (
      <div>
        <h1 className="mb-1 text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
          Welcome aboard
        </h1>
        <p className="mb-6 text-sm text-[color:var(--text-secondary)]">Let's get you set up.</p>
        <OnboardingSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
          <EmptyState
            icon={AlertCircle}
            title="Could not load your onboarding"
            body="Something went wrong while loading your onboarding case."
            action={{ label: "Retry", onClick: loadCase }}
          />
        </div>
      </div>
    );
  }

  if (obCase === null || obCase.status === "COMPLETE") {
    return (
      <div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
          <EmptyState
            icon={obCase?.status === "COMPLETE" ? PartyPopper : CheckCircle2}
            title={obCase?.status === "COMPLETE" ? "Onboarding complete" : "No onboarding in progress"}
            body={
              obCase?.status === "COMPLETE"
                ? "You're all set — nothing left to do here."
                : "Your onboarding hasn't started yet. Check back later."
            }
          />
        </div>
      </div>
    );
  }

  // ── Active case — derive the wizard state ─────────────────────────────────

  const { documents } = obCase;
  const filledFields = fields.filter((f) => f.value.trim() !== "").length;
  const profileDone = fields.length === 0 || filledFields === fields.length;
  const docsToUpload = documents.filter((d) => d.status === "PENDING" || d.status === "REJECTED").length;
  const docsInReview = documents.filter((d) => d.status === "SUBMITTED").length;
  const docsApproved = documents.filter((d) => d.status === "APPROVED").length;
  const docsDone = documents.length === 0 || docsToUpload === 0;
  const canActivate = profileDone && docsDone && documents.length > 0;

  const currentStep = !profileDone ? 2 : !docsDone ? 3 : 4;

  // Progress: filled fields + approved docs count full, in-review docs count half.
  const totalUnits = fields.length + documents.length || 1;
  const doneUnits = filledFields + docsApproved + docsInReview * 0.5;
  const progress = Math.round((doneUnits / totalUnits) * 100);

  return (
    <div className="space-y-6">
      {/* Header + step indicator + progress */}
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
              Welcome aboard{me?.displayName ? `, ${me.displayName.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]}
            </p>
          </div>
          <StatusBadge status={obCase.status} />
        </div>
        <StepIndicator current={currentStep} />
        <div className="mt-5">
          <ProgressBar value={progress} label="Onboarding progress" counter={`${progress}%`} />
        </div>
      </div>

      {/* What's blocking activation */}
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">What's left before you're active</h2>
        <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
          {canActivate
            ? "Everything's in — your documents are with HR for review."
            : "Finish the items below to send your onboarding to HR."}
        </p>
        <ul className="mt-3 divide-y divide-[color:var(--border-primary)]">
          <ChecklistRow
            state={profileDone ? "done" : "todo"}
            label="Complete your profile"
            detail={
              profileDone
                ? "All details added."
                : `${fields.length - filledFields} of ${fields.length} field(s) still need a value.`
            }
          />
          <ChecklistRow
            state={docsDone ? "done" : "todo"}
            label="Upload your documents"
            detail={
              docsDone
                ? "All documents uploaded."
                : `${docsToUpload} document(s) still to upload.`
            }
          />
          <ChecklistRow
            state={docsApproved === documents.length ? "done" : docsInReview > 0 ? "waiting" : "todo"}
            label="HR review & approval"
            detail={
              docsApproved === documents.length
                ? "All documents approved."
                : docsInReview > 0
                  ? `${docsInReview} document(s) in review with HR.`
                  : "Starts once your documents are uploaded."
            }
          />
        </ul>

        {canActivate && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                Simulate HR approval
              </p>
              <p className="text-[12px] text-[color:var(--text-tertiary)]">
                Demo shortcut — approves your documents and activates your account.
              </p>
            </div>
            <Button onClick={handleActivate} disabled={activating} className="shrink-0">
              {activating ? "Activating…" : "Approve & finish"}
            </Button>
          </div>
        )}
      </div>

      {/* 1 · Review your details (HR pre-filled, read-only) */}
      <PageSection title="Review your details" description="Your HR team pre-filled these. Let them know if anything's off.">
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white px-6" style={{ boxShadow: "var(--shadow-xs)" }}>
          <ReviewRow label="Full name" value={me?.displayName ?? ""} />
          <ReviewRow label="Work email" value={me?.email ?? ""} />
          <ReviewRow label="Job title" value={me?.jobTitle ?? ""} />
          <ReviewRow label="Department" value={me?.department ?? ""} />
          <ReviewRow label="Supervisor" value={supervisorName} />
          <ReviewRow label="Start date" value={me?.startDate ?? ""} />
        </div>
      </PageSection>

      {/* 2 · Profile information (editable) */}
      <PageSection title="Complete your profile" description="Fill in your details and save when done.">
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
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

      {/* 3 · Documents */}
      <PageSection title="Upload your documents" description="Upload each required document for HR review.">
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white px-6" style={{ boxShadow: "var(--shadow-xs)" }}>
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
