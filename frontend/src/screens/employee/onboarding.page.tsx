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

import { useAuth } from "@/modules/auth/hooks/use-auth";
import { markEmployeeActive } from "@/modules/auth/stores/auth.store";
import {
  useMyOnboarding,
  useSubmitCustomFields,
  useSubmitDocument,
  useCompleteMyOnboarding,
} from "@/modules/people/onboarding/hooks/use-my-onboarding";
import type { OnboardingCustomFieldStatus } from "@/modules/people/onboarding/types/onboarding.types";

import { ProgressBar } from "@/shared/ui/patterns/progress-bar";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { PageSection } from "@/shared/ui/patterns/page-section";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";

// ─── Document link validation ────────────────────────────────────────────────
// File storage isn't in scope tonight, so the employee submits a link to the
// document (e.g. a shared drive URL). The backend requires an http(s) fileUrl.

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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
  id,
  name,
  rejectionNote,
  status,
  busy,
  onSubmit,
}: {
  id: string;
  name: string;
  rejectionNote: string | null;
  // null = not yet submitted
  status: "pending" | "approved" | "rejected" | null;
  busy: boolean;
  onSubmit: (fileUrl: string) => void;
}) {
  // Reveal the link field on demand. Auto-open when a submission was rejected so
  // the employee can re-submit straight away.
  const [open, setOpen] = useState(status === "rejected");
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = url.trim();
  const valid = isHttpUrl(trimmed);
  const inputId = `doc-url-${id}`;
  const showError = touched && trimmed.length > 0 && !valid;

  function handleSubmit() {
    setTouched(true);
    if (!valid) return;
    onSubmit(trimmed);
    setUrl("");
    setTouched(false);
    setOpen(false);
  }

  return (
    <div className="border-t border-[color:var(--border-primary)] py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">{name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status ? <StatusBadge status={status} /> : null}
          {status === null && !open && (
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={busy}>
              <Upload className="h-3.5 w-3.5" />
              Add link
            </Button>
          )}
          {status === "pending" && (
            <span className="text-xs text-[color:var(--text-tertiary)]">Awaiting review</span>
          )}
          {status === "approved" && (
            <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-hidden="true" />
          )}
          {status === "rejected" && !open && (
            <Button size="sm" variant="destructive" onClick={() => setOpen(true)} disabled={busy}>
              <Upload className="h-3.5 w-3.5" />
              Re-submit link
            </Button>
          )}
        </div>
      </div>

      {/* HR's rejection reason, so the employee knows what to fix. */}
      {status === "rejected" && rejectionNote && (
        <p className="mt-2 text-xs text-[#B42318]">
          Rejected: {rejectionNote}
        </p>
      )}

      {/* Inline document-link field. */}
      {open && (
        <div className="mt-3">
          <FormField
            label="Document link"
            htmlFor={inputId}
            hint="Paste a shareable link to the document (must start with http:// or https://)."
            error={showError ? "Enter a valid http or https URL." : undefined}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={inputId}
                type="url"
                inputMode="url"
                placeholder="https://drive.example.com/my-document.pdf"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setTouched(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={busy || !valid}>
                  {busy ? "Submitting…" : "Submit"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false);
                    setUrl("");
                    setTouched(false);
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </FormField>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeOnboardingPage() {
  const { appUser } = useAuth();
  const router = useRouter();

  const isEmployee = appUser?.role === "EMPLOYEE";
  const { status, loading, error, reload } = useMyOnboarding(isEmployee);
  const submitFields = useSubmitCustomFields();
  const submitDoc = useSubmitDocument();
  const completeOnboarding = useCompleteMyOnboarding();

  // Local editable copy of the custom field answers.
  const [fields, setFields] = useState<OnboardingCustomFieldStatus[]>([]);

  useEffect(() => {
    if (status) setFields(status.customFields);
  }, [status]);

  // ── Save custom fields ────────────────────────────────────────────────────

  function handleSaveFields() {
    const answers = fields
      .filter((f) => (f.value ?? "").trim() !== "")
      .map((f) => ({ fieldId: f.id, value: (f.value ?? "").trim() }));
    if (answers.length === 0) {
      toast.error("Fill in at least one field before saving.");
      return;
    }
    submitFields.mutate(answers, {
      onSuccess: () => toast.success("Profile details saved"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your details."),
    });
  }

  // ── Submit / re-submit a document link ────────────────────────────────────

  function handleSubmitDocument(documentId: string, fileUrl: string) {
    submitDoc.mutate(
      { documentId, fileUrl },
      {
        onSuccess: () => toast.success("Document submitted for review"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit your document."),
      },
    );
  }

  // ── Finish onboarding ─────────────────────────────────────────────────────

  function handleComplete() {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        // Release the in-session onboarding gate and route home.
        markEmployeeActive();
        toast.success("You're all set — welcome to Manage Jia!");
        router.replace("/");
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Some items are still incomplete."),
    });
  }

  // ── Render: loading / error / empty ───────────────────────────────────────

  if (loading) {
    return (
      <div>
        <h1 className="mb-1 text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
          Welcome aboard
        </h1>
        <p className="mb-6 text-sm text-[color:var(--text-secondary)]">Let&apos;s get you set up.</p>
        <OnboardingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
          <EmptyState
            icon={AlertCircle}
            title="Could not load your onboarding"
            body="Something went wrong while loading your onboarding case."
            action={{ label: "Retry", onClick: () => void reload() }}
          />
        </div>
      </div>
    );
  }

  if (status === null || status.isComplete) {
    return (
      <div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white" style={{ boxShadow: "var(--shadow-xs)" }}>
          <EmptyState
            icon={status?.isComplete ? PartyPopper : CheckCircle2}
            title={status?.isComplete ? "Onboarding complete" : "No onboarding in progress"}
            body={
              status?.isComplete
                ? "You're all set — nothing left to do here."
                : "Your onboarding hasn't started yet. Check back later."
            }
          />
        </div>
      </div>
    );
  }

  // ── Active case — derive the wizard state ─────────────────────────────────

  const { profile, documents } = status;
  const filledFields = fields.filter((f) => (f.value ?? "").trim() !== "").length;
  const profileDone = fields.length === 0 || filledFields === fields.length;

  const docStatus = (docId: string) =>
    documents.find((d) => d.id === docId)?.latestSubmission?.status ?? null;
  const docsToUpload = documents.filter((d) => {
    const s = d.latestSubmission?.status ?? null;
    return s === null || s === "rejected";
  }).length;
  const docsInReview = documents.filter((d) => d.latestSubmission?.status === "pending").length;
  const docsApproved = documents.filter((d) => d.latestSubmission?.status === "approved").length;
  const docsDone = documents.length === 0 || docsToUpload === 0;
  const canComplete = profileDone && docsDone && documents.length > 0;

  const currentStep = !profileDone ? 2 : !docsDone ? 3 : 4;

  // Progress: filled fields + approved docs count full, in-review docs count half.
  const totalUnits = fields.length + documents.length || 1;
  const doneUnits = filledFields + docsApproved + docsInReview * 0.5;
  const progress = Math.round((doneUnits / totalUnits) * 100);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      {/* Header + step indicator + progress */}
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
              Welcome aboard{profile.firstName ? `, ${profile.firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
              Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1]}
            </p>
          </div>
          <StatusBadge status={status.isComplete ? "COMPLETE" : "ONBOARDING"} />
        </div>
        <StepIndicator current={currentStep} />
        <div className="mt-5">
          <ProgressBar value={progress} label="Onboarding progress" counter={`${progress}%`} />
        </div>
      </div>

      {/* What's blocking activation */}
      <div className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6" style={{ boxShadow: "var(--shadow-xs)" }}>
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">What&apos;s left before you&apos;re active</h2>
        <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
          {canComplete
            ? "Everything's in — finish to activate your account."
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
              docsDone ? "All documents uploaded." : `${docsToUpload} document(s) still to upload.`
            }
          />
          <ChecklistRow
            state={docsApproved === documents.length && documents.length > 0 ? "done" : docsInReview > 0 ? "waiting" : "todo"}
            label="HR review & approval"
            detail={
              docsApproved === documents.length && documents.length > 0
                ? "All documents approved."
                : docsInReview > 0
                  ? `${docsInReview} document(s) in review with HR.`
                  : "Starts once your documents are uploaded."
            }
          />
        </ul>

        {canComplete && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                Finish onboarding
              </p>
              <p className="text-[12px] text-[color:var(--text-tertiary)]">
                Submit your onboarding to activate your account.
              </p>
            </div>
            <Button onClick={handleComplete} disabled={completeOnboarding.isPending} className="shrink-0">
              {completeOnboarding.isPending ? "Finishing…" : "Finish onboarding"}
            </Button>
          </div>
        )}
      </div>

      {/* 1 · Review your details (HR pre-filled, read-only) */}
      <PageSection title="Review your details" description="Your HR team pre-filled these. Let them know if anything's off.">
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-white px-6" style={{ boxShadow: "var(--shadow-xs)" }}>
          <ReviewRow label="Full name" value={fullName} />
          <ReviewRow label="Personal email" value={profile.personalEmail ?? ""} />
          <ReviewRow label="Job title" value={profile.jobTitle ?? ""} />
          <ReviewRow label="Department" value={profile.department ?? ""} />
          <ReviewRow label="Address" value={profile.address ?? ""} />
          <ReviewRow label="Emergency contact" value={profile.emergencyContact ?? ""} />
        </div>
      </PageSection>

      {/* 2 · Profile information (editable custom fields) */}
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
                  const fieldId = `custom-field-${field.id}`;
                  return (
                    <FormField
                      key={field.id}
                      label={field.fieldLabel + (field.isRequired ? " *" : "")}
                      htmlFor={fieldId}
                    >
                      <Input
                        id={fieldId}
                        value={field.value ?? ""}
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
                <Button onClick={handleSaveFields} disabled={submitFields.isPending}>
                  {submitFields.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </>
          )}
        </div>
      </PageSection>

      {/* 3 · Documents */}
      <PageSection title="Upload your documents" description="Add a shareable link to each required document for HR review.">
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
                  key={doc.id}
                  id={doc.id}
                  name={doc.documentName}
                  rejectionNote={doc.latestSubmission?.rejectionNote ?? null}
                  status={docStatus(doc.id)}
                  busy={submitDoc.isPending}
                  onSubmit={(fileUrl) => handleSubmitDocument(doc.id, fileUrl)}
                />
              ))}
            </div>
          )}
        </div>
      </PageSection>
    </div>
  );
}
