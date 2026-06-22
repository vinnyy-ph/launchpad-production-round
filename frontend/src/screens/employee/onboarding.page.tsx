"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  AlertCircle,
  PartyPopper,
  FileText,
  Mail,
  Lock,
} from "lucide-react";

import { useAuth } from "@/modules/auth/hooks/use-auth";
import {
  useMyOnboarding,
  useSubmitCustomFields,
  useSubmitMyOnboardingForReview,
  useUpdateMyProfile,
} from "@/modules/people/onboarding/hooks/use-my-onboarding";
import { submitDocument } from "@/modules/people/onboarding/services/onboarding.service";
import type {
  OnboardingCustomFieldStatus,
  OnboardingDocStatus,
  OnboardingProfile,
} from "@/modules/people/onboarding/types/onboarding.types";
import { DocumentUploadRow } from "@/modules/people/onboarding/components/documents/document-upload";

import { queryKeys } from "@/shared/lib/query-keys";
import { isValidPhilippinePhone, toE164 } from "@/shared/lib/phone";

import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { ProgressSteps } from "@/shared/ui/patterns/progress-steps";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { DatePicker } from "@/shared/ui/primitives/date-picker";
import { PhoneInput } from "@/shared/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_LABELS = ["Your details", "Quick questions", "Documents", "Review"] as const;
const CARD_SHADOW = "inset 0 0 2px 0 rgba(0,16,53,.16), 0 1px 2px 0 rgba(14,16,27,.05)";
const DISABLED_FIELD_INPUT =
  "bg-[#FAFAFA] pl-9 text-[color:var(--text-tertiary)] disabled:opacity-100";
const DISABLED_FIELD_ICON =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]";

type MarkerState = "done" | "current" | "upcoming";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  personalEmail: string;
  birthday?: Date;
  address: string;
  city: string;
  province: string;
  country: string;
  emergencyContactName: string;
  emergencyContact: string;
};

// ─── pure helpers ─────────────────────────────────────────────────────────────

function profileComplete(p: OnboardingProfile): boolean {
  return (
    Boolean(p.firstName?.trim()) &&
    Boolean(p.personalEmail?.trim()) &&
    EMAIL_RE.test(p.personalEmail?.trim() ?? "") &&
    Boolean(p.lastName?.trim()) &&
    Boolean(p.birthday) &&
    Boolean(p.address?.address?.trim()) &&
    Boolean(p.address?.city?.trim()) &&
    Boolean(p.address?.province?.trim()) &&
    Boolean(p.address?.country?.trim()) &&
    Boolean(p.emergencyContact?.emergencyContactName?.trim()) &&
    Boolean(p.emergencyContact?.emergencyContactNumber?.trim())
  );
}

function fieldsComplete(fields: OnboardingCustomFieldStatus[]): boolean {
  return fields.length === 0 || fields.every((f) => !f.isRequired || (f.value ?? "").trim() !== "");
}

function profileDraftErrors(draft: ProfileDraft): Record<string, string> {
  const next: Record<string, string> = {};
  if (!draft.firstName.trim()) next.firstName = "First name is required.";
  if (!draft.lastName.trim()) next.lastName = "Last name is required.";
  if (!EMAIL_RE.test(draft.personalEmail.trim())) next.personalEmail = "Enter a valid personal email.";
  if (!draft.birthday) next.birthday = "Birthday is required.";
  else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(draft.birthday);
    selected.setHours(0, 0, 0, 0);
    if (selected > today) next.birthday = "Birthday cannot be in the future.";
  }
  if (!draft.address.trim()) next.address = "Street address is required.";
  if (!draft.city.trim()) next.city = "City is required.";
  if (!draft.province.trim()) next.province = "Province is required.";
  if (!draft.country.trim()) next.country = "Country is required.";
  if (!draft.emergencyContactName.trim()) next.emergencyContactName = "Contact name is required.";
  if (!draft.emergencyContact.trim()) next.emergencyContact = "Contact number is required.";
  return next;
}

function fileNameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.split("?")[0].split("#")[0];
  const base = clean.substring(clean.lastIndexOf("/") + 1);
  if (!base) return null;
  try {
    return decodeURIComponent(base);
  } catch {
    return base;
  }
}

// ─── small presentational pieces ──────────────────────────────────────────────

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-8"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="py-4">
        <h2 className="text-xl font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">{title}</h2>
        <p className="mt-1.5 text-sm text-[color:var(--text-tertiary)]">{subtitle}</p>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3.5 py-3">
      <Lock
        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="text-sm text-[color:var(--text-tertiary)]">{children}</span>
    </div>
  );
}

function ReviewSectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="ob-review-section-title">{title}</h3>
        <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success-600)]" strokeWidth={2} aria-hidden="true" />
      </div>
      <button
        type="button"
        onClick={onAction}
        className="ob-review-action-link"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ReviewField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="ob-review-field-label">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function HrSetBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold leading-none text-[color:var(--text-tertiary)]">
      Set by HR
    </span>
  );
}

function reviewDocumentBadge(
  status: OnboardingDocStatus | null,
  hasStagedFile: boolean,
): { label: string; tone: "neutral" | "success" | "error" | "warning" } | null {
  if (status === "pending") return { label: "In review", tone: "neutral" };
  if (status === "approved") return { label: "Approved", tone: "success" };
  if (status === "rejected") return { label: "Rejected", tone: "error" };
  if (hasStagedFile) return { label: "Ready", tone: "neutral" };
  return null;
}

function ReviewDocumentRow({
  documentName,
  filename,
  status,
  hasStagedFile,
}: {
  documentName: string;
  filename: string;
  status: OnboardingDocStatus | null;
  hasStagedFile: boolean;
}) {
  const badge = reviewDocumentBadge(status, hasStagedFile);

  return (
    <div className="ob-review-doc-row flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] text-[color:var(--text-tertiary)]">
        <FileText className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{documentName}</p>
        <p className="truncate text-xs text-[color:var(--text-tertiary)]" title={filename}>
          {filename}
        </p>
      </div>
      {badge ? (
        <StatusBadge status={badge.label} tone={badge.tone} dot shape="modern" className="shrink-0" />
      ) : null}
    </div>
  );
}

function OnboardingSkeleton() {
  return (
    <div
      className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-8"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmittedConfirmation() {
  return (
    <section
      className="ob-submitted-card rounded-2xl border border-[color:var(--border-primary)] bg-white px-8 py-14 text-center"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="ob-submitted-icon-box mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[color:var(--border-primary)] bg-white">
        <Mail className="h-5 w-5 text-[color:var(--text-tertiary)]" strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">
        Submitted for review
      </h2>
      <p className="ob-submitted-body mx-auto mt-3 max-w-md text-sm [text-wrap:pretty]">
        HR is reviewing your documents. You&apos;ll get an email once your account is activated.
      </p>
    </section>
  );
}

type TimelineStepState = "complete" | "active" | "pending";

function ReviewTimelineStep({
  state,
  title,
  meta,
  description,
  isLast,
}: {
  state: TimelineStepState;
  title: string;
  meta?: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div className="ob-review-timeline-step flex gap-4">
      <div className="flex flex-col items-center">
        {state === "complete" ? (
          <span className="ob-review-timeline-marker ob-review-timeline-marker--complete flex h-6 w-6 items-center justify-center rounded-full">
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </span>
        ) : state === "active" ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-jia">
            <span className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
          </span>
        ) : (
          <span className="ob-review-timeline-marker ob-review-timeline-marker--pending flex h-6 w-6 items-center justify-center rounded-full">
            <span className="h-2 w-2 rounded-full bg-[color:var(--gray-300)]" aria-hidden="true" />
          </span>
        )}
        {!isLast ? (
          <span
            className={
              state === "complete"
                ? "ob-review-timeline-line ob-review-timeline-line--complete mt-1 min-h-12 w-px flex-1"
                : "ob-review-timeline-line mt-1 min-h-12 w-px flex-1"
            }
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className={isLast ? "pb-0" : "pb-8"}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
          {meta ? <p className="text-xs text-[color:var(--text-tertiary)]">{meta}</p> : null}
        </div>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)] [text-wrap:pretty]">{description}</p>
      </div>
    </div>
  );
}

function formatReviewDateLabel(isoDate: string | undefined): string {
  if (!isoDate) return "Today";
  const date = new Date(isoDate);
  return isToday(date) ? "Today" : format(date, "MMM d, yyyy");
}

function AccountUnderReviewStatus({
  documents,
  allDocsApproved,
}: {
  documents: Array<{
    id: string;
    documentName: string;
    latestSubmission: { fileUrl: string; status: OnboardingDocStatus; submittedAt: string } | null;
  }>;
  allDocsApproved: boolean;
}) {
  const docsApproved = documents.filter((d) => d.latestSubmission?.status === "approved").length;
  const docsTotal = documents.length;
  const submittedAt = documents
    .map((d) => d.latestSubmission?.submittedAt)
    .filter(Boolean)
    .sort()[0];

  const documentReviewState: TimelineStepState = allDocsApproved ? "complete" : "active";
  const activationState: TimelineStepState = allDocsApproved ? "active" : "pending";

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
      <section
        className="rounded-2xl border border-[color:var(--border-primary)] bg-white px-8 py-10 text-center"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[color:var(--text-primary)] [text-wrap:pretty]">
          Your account is under review
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--text-tertiary)] [text-wrap:pretty]">
          HR is reviewing each of your documents. You&apos;ll get an email when there&apos;s an update — no need
          to wait here.
        </p>
      </section>

      <section
        className="rounded-2xl border border-[color:var(--border-primary)] bg-white px-8 py-8"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="mb-8">
          <ReviewTimelineStep
            state="complete"
            title="Submitted for review"
            meta={formatReviewDateLabel(submittedAt)}
            description="You sent your details and documents to HR."
            isLast={false}
          />
          <ReviewTimelineStep
            state={documentReviewState}
            title="Document review"
            description={
              docsTotal === 0
                ? "HR is reviewing your submission."
                : `HR is checking each document. ${docsApproved} of ${docsTotal} approved so far.`
            }
            isLast={false}
          />
          <ReviewTimelineStep
            state={activationState}
            title="Account activated"
            description="You'll get an email the moment your account is ready."
            isLast
          />
        </div>

        {docsTotal > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="ob-review-section-title">Documents</p>
              <p className="text-xs font-medium text-[color:var(--text-tertiary)]">
                {docsApproved} of {docsTotal} approved
              </p>
            </div>
            <div className="space-y-3">
              {documents.map((doc) => (
                <ReviewDocumentRow
                  key={doc.id}
                  documentName={doc.documentName}
                  filename={fileNameFromUrl(doc.latestSubmission?.fileUrl) ?? "—"}
                  status={doc.latestSubmission?.status ?? null}
                  hasStagedFile={false}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EmployeeOnboardingPage() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const isEmployee = appUser?.role === "EMPLOYEE";
  const { status, loading, error, reload } = useMyOnboarding(isEmployee);
  const submitFields = useSubmitCustomFields();
  const updateProfile = useUpdateMyProfile();
  const submitForReview = useSubmitMyOnboardingForReview();

  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<OnboardingCustomFieldStatus[]>([]);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [birthday, setBirthday] = useState<Date | undefined>();
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [touchedProfileFields, setTouchedProfileFields] = useState<Record<string, boolean>>({});
  const [touchedCustomFields, setTouchedCustomFields] = useState<Record<string, boolean>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [finishing, setFinishing] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const didInitStep = useRef(false);

  useEffect(() => {
    if (!status) return;

    setFields(status.customFields ?? []);
    const profile = status.profile;
    setFirstName(profile.firstName ?? "");
    setMiddleName(profile.middleName ?? "");
    setLastName(profile.lastName ?? "");
    setPersonalEmail(profile.personalEmail ?? "");
    setAddress(profile.address?.address ?? "");
    setCity(profile.address?.city ?? "");
    setProvince(profile.address?.province ?? "");
    setCountry(profile.address?.country ?? "");
    setEmergencyContactName(profile.emergencyContact?.emergencyContactName ?? "");
    void toE164(profile.emergencyContact?.emergencyContactNumber ?? "").then(setEmergencyContact);
    setBirthday(profile.birthday ? new Date(`${profile.birthday}T00:00:00`) : undefined);

    // Resume the wizard at the first incomplete step — only on first load.
    if (!didInitStep.current) {
      didInitStep.current = true;
      const docsReady =
        (status.documents ?? []).length === 0 ||
        (status.documents ?? []).every((d) => {
          const s = d.latestSubmission?.status ?? null;
          return s === "pending" || s === "approved";
        });
      setStep(
        !profileComplete(profile)
          ? 1
          : !fieldsComplete(status.customFields ?? [])
            ? 2
            : !docsReady
              ? 3
              : 4,
      );
    }
  }, [status]);

  const profileDraft: ProfileDraft = {
    firstName,
    lastName,
    personalEmail,
    birthday,
    address,
    city,
    province,
    country,
    emergencyContactName,
    emergencyContact,
  };
  const currentProfileErrors = profileDraftErrors(profileDraft);
  const profileCanContinue = Object.keys(currentProfileErrors).length === 0;
  const touchedProfileErrors = Object.fromEntries(
    Object.entries(currentProfileErrors).filter(([field]) => touchedProfileFields[field] || profileErrors[field]),
  );
  const visibleProfileErrors = { ...profileErrors, ...touchedProfileErrors };

  function touchProfileField(field: string): void {
    setTouchedProfileFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
    setProfileErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function profilePayload() {
    return {
      firstName: firstName.trim(),
      middleName: middleName.trim() || null,
      lastName: lastName.trim(),
      personalEmail: personalEmail.trim(),
      birthday: format(birthday!, "yyyy-MM-dd"),
      address: address.trim(),
      city: city.trim(),
      province: province.trim(),
      country: country.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContact: emergencyContact.trim(),
    };
  }

  async function handleContinueFromProfile(): Promise<void> {
    const next = profileDraftErrors(profileDraft);
    if (Object.keys(next).length === 0 && !(await isValidPhilippinePhone(emergencyContact))) {
      next.emergencyContact = "Enter a valid Philippine mobile number.";
    }
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;
    setStep(2);
    return;
  }

  function handleContinueFromFields(): void {
    if (!fieldsCanContinue) {
      toast.error("Please answer the required question(s).");
      return;
    }
    if (fields.length === 0) {
      setStep(3);
      return;
    }
    setStep(3);
    return;
  }

  function handleSelectDocument(documentId: string, file: File): void {
    setPendingFiles((prev) => ({ ...prev, [documentId]: file }));
  }

  function handleRemoveDocument(documentId: string): void {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  }

  async function handleSubmitForReview(): Promise<void> {
    if (!status) return;
    if (!profileCanContinue) {
      setProfileErrors(currentProfileErrors);
      toast.error("Complete your personal details before submitting.");
      setStep(1);
      return;
    }
    if (!(await isValidPhilippinePhone(emergencyContact))) {
      setProfileErrors({ emergencyContact: "Enter a valid Philippine mobile number." });
      toast.error("Enter a valid emergency contact number before submitting.");
      setStep(1);
      return;
    }
    if (!fieldsCanContinue) {
      toast.error("Answer the quick questions before submitting.");
      setStep(2);
      return;
    }

    setFinishing(true);
    try {
      await updateProfile.mutateAsync(profilePayload());

      const answeredFields = fields
        .filter((f) => (f.value ?? "").trim() !== "")
        .map((f) => ({ fieldId: f.id, value: (f.value ?? "").trim() }));
      if (answeredFields.length > 0) {
        await submitFields.mutateAsync(answeredFields);
      }

      for (const [documentId, file] of Object.entries(pendingFiles)) {
        await submitDocument(documentId, file);
      }
      await submitForReview.mutateAsync();
      setPendingFiles({});
      setHasSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Some items are still incomplete.");
    } finally {
      setFinishing(false);
    }
  }

  // ── non-wizard states ──
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[960px]">
        <OnboardingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[960px]">
        <div
          className="rounded-2xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: CARD_SHADOW }}
        >
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
      <div className="mx-auto w-full max-w-[960px]">
        <div
          className="rounded-2xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: CARD_SHADOW }}
        >
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

  // ── derived state ──
  const { profile } = status;
  const documents = status.documents ?? [];

  const personalDetailsDone = profileCanContinue;
  const fieldsCanContinue = fieldsComplete(fields);
  const profileDone = personalDetailsDone && fieldsCanContinue;

  const docStatus = (docId: string) =>
    documents.find((d) => d.id === docId)?.latestSubmission?.status ?? null;

  const documentIsReady = (docId: string) => {
    const s = docStatus(docId);
    if (s === "pending" || s === "approved") return true;
    return Boolean(pendingFiles[docId]);
  };

  const docsInReview = documents.filter((d) => d.latestSubmission?.status === "pending").length;
  const stagedCount = Object.keys(pendingFiles).length;
  const docsUploaded = documents.filter((d) => {
    const s = docStatus(d.id);
    return s === "pending" || s === "approved" || Boolean(pendingFiles[d.id]);
  }).length;
  const docsToUpload = documents.length - docsUploaded;
  const docsDone = documents.length === 0 || documents.every((d) => documentIsReady(d.id));
  const allDocsApproved = documents.length > 0 && documents.every((d) => docStatus(d.id) === "approved");

  const awaitingHrReview =
    profileDone &&
    docsDone &&
    stagedCount === 0 &&
    docsToUpload === 0 &&
    docsInReview > 0 &&
    !allDocsApproved &&
    !status.isComplete;
  const awaitingHrActivation = allDocsApproved && !status.isComplete;
  const submitted =
    profileDone && docsDone && (hasSubmitted || awaitingHrReview || awaitingHrActivation);
  const canSubmitToHr = profileDone && docsDone && !status.isComplete && !submitted;

  const markerState = (n: number): MarkerState => {
    if (submitted) return "done";
    const done =
      n === 1 ? personalDetailsDone : n === 2 ? fieldsCanContinue : n === 3 ? docsDone : false;
    if (done && step !== n) return "done";
    if (step === n) return "current";
    return "upcoming";
  };

  const canGoStep = (n: number): boolean => {
    if (submitted) return false;
    if (n <= step) return true;
    if (n >= 2 && !personalDetailsDone) return false;
    if (n >= 3 && !fieldsCanContinue) return false;
    if (n >= 4 && !docsDone) return false;
    return true;
  };
  const companyEmail = profile.companyEmail ?? appUser?.email ?? "";

  const goStep = (n: number) => {
    if (canGoStep(n)) setStep(n);
  };
  const progressSteps = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const state = markerState(n);
    return {
      label,
      status: state === "done" ? "complete" : state,
      disabled: !canGoStep(n),
      onClick: () => goStep(n),
    } as const;
  });
  const back = () => setStep((s) => Math.max(1, s - 1));

  // Screen 2 — return visit while HR is reviewing (not the moment you just clicked Submit)
  if (submitted && !hasSubmitted) {
    return <AccountUnderReviewStatus documents={documents} allDocsApproved={allDocsApproved} />;
  }

  return (
    <div className="mx-auto w-full max-w-[960px]">
      {/* Welcome */}
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-medium leading-8 text-[color:var(--text-primary)] [text-wrap:pretty]">
          Welcome aboard{profile.firstName ? `, ${profile.firstName}` : ""}.
        </h1>
        <p className="text-base text-[color:var(--text-tertiary)] [text-wrap:pretty]">
          Your progress saves as you go, finish anytime.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <ProgressSteps items={progressSteps} className="mx-auto max-w-[760px]" />

        {submitted && hasSubmitted ? (
          <SubmittedConfirmation />
        ) : (
          <>
        {/* ── Step 1 — Your details ── */}
        {step === 1 && (
          <StepCard
            title="Confirm your details"
            subtitle="HR started this for you. Check what's here, fix anything that's wrong, and add the rest."
          >
          <div className="flex flex-col gap-9">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Personal
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid grid-cols-1 gap-4 sm:col-span-2 lg:grid-cols-3">
                  <FormField label="First name" required htmlFor="ob-first" error={visibleProfileErrors.firstName}>
                    <Input
                      id="ob-first"
                      value={firstName}
                      error={Boolean(visibleProfileErrors.firstName)}
                      onChange={(e) => {
                        touchProfileField("firstName");
                        setFirstName(e.target.value);
                      }}
                    />
                  </FormField>
                  <FormField label="Middle name" htmlFor="ob-middle">
                    <Input id="ob-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </FormField>
                  <FormField label="Last name" required htmlFor="ob-last" error={visibleProfileErrors.lastName}>
                    <Input
                      id="ob-last"
                      value={lastName}
                      error={Boolean(visibleProfileErrors.lastName)}
                      onChange={(e) => {
                        touchProfileField("lastName");
                        setLastName(e.target.value);
                      }}
                    />
                  </FormField>
                </div>
                <FormField
                  label="Birthday"
                  required
                  htmlFor="ob-birthday"
                  error={visibleProfileErrors.birthday}
                  className="sm:col-span-2"
                >
                  <DatePicker
                    disableFuture
                    value={birthday}
                    onChange={(next) => {
                      touchProfileField("birthday");
                      setBirthday(next);
                    }}
                    className="w-full"
                  />
                </FormField>
                <FormField
                  label="Personal email"
                  required
                  htmlFor="ob-personal-email"
                  error={visibleProfileErrors.personalEmail}
                  className="sm:col-span-2"
                >
                  <Input
                    id="ob-personal-email"
                    type="email"
                    value={personalEmail}
                    error={Boolean(visibleProfileErrors.personalEmail)}
                    onChange={(e) => {
                      touchProfileField("personalEmail");
                      setPersonalEmail(e.target.value);
                    }}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Address
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  label="Street address"
                  required
                  htmlFor="ob-address"
                  error={visibleProfileErrors.address}
                  className="sm:col-span-3"
                >
                  <Input
                    id="ob-address"
                    value={address}
                    error={Boolean(visibleProfileErrors.address)}
                    onChange={(e) => {
                      touchProfileField("address");
                      setAddress(e.target.value);
                    }}
                    placeholder="House/unit no., street, barangay"
                  />
                </FormField>
                <FormField
                  label="Country"
                  required
                  htmlFor="ob-country"
                  error={visibleProfileErrors.country}
                >
                  <Input
                    id="ob-country"
                    value={country}
                    error={Boolean(visibleProfileErrors.country)}
                    onChange={(e) => {
                      touchProfileField("country");
                      setCountry(e.target.value);
                    }}
                  />
                </FormField>
                <FormField label="Province" required htmlFor="ob-province" error={visibleProfileErrors.province}>
                  <Input
                    id="ob-province"
                    value={province}
                    error={Boolean(visibleProfileErrors.province)}
                    onChange={(e) => {
                      touchProfileField("province");
                      setProvince(e.target.value);
                    }}
                  />
                </FormField>
                <FormField label="City" required htmlFor="ob-city" error={visibleProfileErrors.city}>
                  <Input
                    id="ob-city"
                    value={city}
                    error={Boolean(visibleProfileErrors.city)}
                    onChange={(e) => {
                      touchProfileField("city");
                      setCity(e.target.value);
                    }}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Contact name"
                  required
                  htmlFor="ob-emergency-name"
                  error={visibleProfileErrors.emergencyContactName}
                >
                  <Input
                    id="ob-emergency-name"
                    value={emergencyContactName}
                    error={Boolean(visibleProfileErrors.emergencyContactName)}
                    onChange={(e) => {
                      touchProfileField("emergencyContactName");
                      setEmergencyContactName(e.target.value);
                    }}
                    placeholder="e.g. Juan Santos"
                  />
                </FormField>
                <FormField
                  label="Contact number"
                  required
                  htmlFor="ob-emergency"
                  error={visibleProfileErrors.emergencyContact}
                >
                  <PhoneInput
                    id="ob-emergency"
                    value={emergencyContact}
                    onChange={(next) => {
                      touchProfileField("emergencyContact");
                      setEmergencyContact(next);
                    }}
                    error={Boolean(visibleProfileErrors.emergencyContact)}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Employment
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Company email"
                  htmlFor="ob-company-email"
                  className="sm:col-span-2"
                >
                  <div className="relative">
                    <Mail
                      className={DISABLED_FIELD_ICON}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <Input
                      id="ob-company-email"
                      type="email"
                      value={companyEmail}
                      readOnly
                      disabled
                      className={DISABLED_FIELD_INPUT}
                    />
                  </div>
                </FormField>
                <FormField label="Job title" htmlFor="ob-job">
                  <div className="relative">
                    <Lock
                      className={DISABLED_FIELD_ICON}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <Input
                      id="ob-job"
                      value={profile.jobTitle ?? ""}
                      readOnly
                      disabled
                      className={DISABLED_FIELD_INPUT}
                    />
                  </div>
                </FormField>
                <FormField label="Department" htmlFor="ob-dept">
                  <div className="relative">
                    <Lock
                      className={DISABLED_FIELD_ICON}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <Input
                      id="ob-dept"
                      value={profile.department ?? ""}
                      readOnly
                      disabled
                      className={DISABLED_FIELD_INPUT}
                    />
                  </div>
                </FormField>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
                Your job title and department are set by HR. Reach out to them if something looks wrong.
              </p>
            </div>
          </div>

          <PrivacyNote>
            Your birthday, address, and emergency contact are private. Only you and HR can see them.
          </PrivacyNote>

          <div className="mt-7 flex justify-end">
            <Button onClick={handleContinueFromProfile} disabled={!profileCanContinue}>
              Continue
            </Button>
          </div>
          </StepCard>
        )}

        {/* ── Step 2 — Quick questions ── */}
        {step === 2 && (
          <StepCard
            title="A few quick questions"
            subtitle="A couple of extra things HR needs from you."
          >
          {fields.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Nothing to answer"
              body="Your HR team hasn't added any extra questions."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {fields.map((field, idx) => {
                const fieldId = `custom-field-${field.id}`;
                const fieldError =
                  touchedCustomFields[field.id] && field.isRequired && !(field.value ?? "").trim()
                    ? "This question is required."
                    : undefined;
                return (
                  <FormField
                    key={field.id}
                    label={field.fieldLabel}
                    required={field.isRequired}
                    htmlFor={fieldId}
                    error={fieldError}
                  >
                    <Input
                      id={fieldId}
                      value={field.value ?? ""}
                      error={Boolean(fieldError)}
                      onChange={(e) => {
                        setTouchedCustomFields((prev) =>
                          prev[field.id] ? prev : { ...prev, [field.id]: true },
                        );
                        const nextFields = [...fields];
                        nextFields[idx] = { ...nextFields[idx], value: e.target.value };
                        setFields(nextFields);
                      }}
                    />
                  </FormField>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button onClick={handleContinueFromFields} disabled={!fieldsCanContinue}>
              Continue
            </Button>
          </div>
          </StepCard>
        )}

        {/* ── Step 3 — Documents ── */}
        {step === 3 && (
          <StepCard
            title="Upload your documents"
            subtitle="These documents are required to complete your onboarding."
          >
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents required"
              body="Your HR team hasn't added any required documents."
            />
          ) : (
            <div className="flex flex-col gap-3.5">
              {documents.map((doc) => (
                <DocumentUploadRow
                  key={doc.id}
                  id={doc.id}
                  name={doc.documentName}
                  instructions={doc.instructions}
                  allowedFileTypes={doc.allowedFileTypes}
                  rejectionNote={doc.latestSubmission?.rejectionNote ?? null}
                  status={docStatus(doc.id)}
                  submittedFileName={fileNameFromUrl(doc.latestSubmission?.fileUrl)}
                  selectedFile={pendingFiles[doc.id] ?? null}
                  onSelect={(file) => handleSelectDocument(doc.id, file)}
                  onRemove={() => handleRemoveDocument(doc.id)}
                />
              ))}
            </div>
          )}

          <PrivacyNote>Your documents are private. Only HR sees them for review.</PrivacyNote>

          <div className="mt-7 flex items-center justify-between">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button onClick={() => goStep(4)} disabled={!docsDone}>
              Continue
            </Button>
          </div>
          </StepCard>
        )}

        {/* ── Step 4 — Review ── */}
        {step === 4 && (
          <StepCard title="Review" subtitle="Make sure everything's right before you submit.">
            <div className="space-y-10">
              <section>
                <ReviewSectionHeader title="Your details" actionLabel="Edit" onAction={() => goStep(1)} />
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <ReviewField label="Name">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {[firstName, middleName, lastName].filter(Boolean).join(" ")}
                    </p>
                  </ReviewField>
                  <ReviewField label="Personal email">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{personalEmail}</p>
                  </ReviewField>
                  <ReviewField label="Birthday" className="sm:col-span-2">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {birthday ? format(birthday, "MMMM d, yyyy") : "—"}
                    </p>
                  </ReviewField>
                  <ReviewField label="Address" className="sm:col-span-2">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {[address, city, province, country].filter(Boolean).join(", ")}
                    </p>
                  </ReviewField>
                  <ReviewField label="Emergency contact" className="sm:col-span-2">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {[emergencyContactName, emergencyContact].filter(Boolean).join(" · ")}
                    </p>
                  </ReviewField>
                  <ReviewField label="Job title">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      {profile.jobTitle ?? "—"}
                      <HrSetBadge />
                    </p>
                  </ReviewField>
                  <ReviewField label="Department">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      {profile.department ?? "—"}
                      <HrSetBadge />
                    </p>
                  </ReviewField>
                </div>
              </section>

              <section>
                <ReviewSectionHeader title="Quick questions" actionLabel="Edit" onAction={() => goStep(2)} />
                {fields.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-tertiary)]">No questions to answer.</p>
                ) : (
                  <div className="space-y-5">
                    {fields.map((field) => (
                      <ReviewField key={field.id} label={field.fieldLabel}>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                          {(field.value ?? "").trim() || "—"}
                        </p>
                      </ReviewField>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <ReviewSectionHeader title="Documents" actionLabel="Manage" onAction={() => goStep(3)} />
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const selected = pendingFiles[doc.id];
                    const filename =
                      selected?.name ?? fileNameFromUrl(doc.latestSubmission?.fileUrl) ?? "No file selected";
                    return (
                      <ReviewDocumentRow
                        key={doc.id}
                        documentName={doc.documentName}
                        filename={filename}
                        status={doc.latestSubmission?.status ?? null}
                        hasStagedFile={Boolean(selected)}
                      />
                    );
                  })}
                </div>
              </section>

              <div className="ob-review-next-box">
                <h3 className="text-sm font-bold text-[color:var(--text-primary)]">What happens next</h3>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-tertiary)] [text-wrap:pretty]">
                  After you submit, HR reviews your documents and activates your account. You'll get an email once
                  it's done.
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="secondary" onClick={back}>
                Back
              </Button>
              {canSubmitToHr && (
                <Button
                  onClick={() => void handleSubmitForReview()}
                  disabled={finishing || submitForReview.isPending}
                >
                  {finishing || submitForReview.isPending ? "Submitting…" : "Submit for review"}
                </Button>
              )}
            </div>
          </StepCard>
        )}
          </>
        )}
      </div>
    </div>
  );
}
