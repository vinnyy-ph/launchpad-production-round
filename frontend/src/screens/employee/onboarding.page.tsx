"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  Upload,
  ArrowRight,
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
import { isStrictPhilippineMobile, toE164 } from "@/shared/lib/phone";

import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { PhAddressFields } from "@/shared/ui/patterns/ph-address-fields";
import { ProgressSteps } from "@/shared/ui/patterns/progress-steps";
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
): { label: string; tone: "review" | "approved" | "changes" } | null {
  if (status === "pending") return { label: "In review", tone: "review" };
  if (status === "approved") return { label: "Approved", tone: "approved" };
  if (status === "rejected") return { label: "Needs changes", tone: "changes" };
  if (hasStagedFile) return { label: "Ready", tone: "review" };
  return null;
}

function ReviewDocumentRow({
  documentName,
  filename,
  status,
  hasStagedFile,
  rejectionNote,
  onReupload,
}: {
  documentName: string;
  filename: string;
  status: OnboardingDocStatus | null;
  hasStagedFile: boolean;
  rejectionNote?: string | null;
  onReupload?: () => void;
}) {
  const badge = reviewDocumentBadge(status, hasStagedFile);
  const needsChanges = status === "rejected";

  return (
    <div className={needsChanges ? "ob-review-doc-row ob-review-doc-row--changes" : "ob-review-doc-row"}>
      <div className="ob-review-doc-main">
        <span className="ob-review-doc-icon">
          <FileText className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ob-review-doc-name truncate">{documentName}</p>
          <p className="ob-review-doc-file truncate" title={filename}>
            {filename}
          </p>
        </div>
        {badge ? (
          <span className={`ob-review-chip ob-review-chip--${badge.tone}`}>
            {badge.tone === "approved" ? (
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
            ) : (
              <span className="ob-review-chip-dot" aria-hidden="true" />
            )}
            {badge.label}
          </span>
        ) : null}
      </div>
      {needsChanges ? (
        <div className="ob-review-doc-detail">
          <div className="ob-review-doc-reason">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <span>{rejectionNote ?? "HR asked for another upload before they can finish reviewing."}</span>
          </div>
          {onReupload ? (
            <Button type="button" size="sm" onClick={onReupload}>
              <Upload className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
              Re-upload
            </Button>
          ) : null}
        </div>
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

type TimelineStepState = "complete" | "active" | "pending" | "alert";

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
    <div className={`ob-review-timeline-step ob-review-timeline-step--${state}`}>
      <div className="ob-review-timeline-rail">
        {state === "complete" ? (
          <span className="ob-review-timeline-marker">
            <Check className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" />
          </span>
        ) : state === "alert" ? (
          <span className="ob-review-timeline-marker">
            <AlertCircle className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </span>
        ) : state === "active" ? (
          <span className="ob-review-timeline-marker">
            <span className="h-[9px] w-[9px] rounded-full bg-white" aria-hidden="true" />
          </span>
        ) : (
          <span className="ob-review-timeline-marker">
            <span className="h-[9px] w-[9px] rounded-full bg-[color:var(--gray-neutral-300)]" aria-hidden="true" />
          </span>
        )}
        {!isLast ? <span className="ob-review-timeline-line" aria-hidden="true" /> : null}
      </div>
      <div className="ob-review-timeline-body">
        <div className="ob-review-timeline-row">
          <p className="ob-review-timeline-title">{title}</p>
          {meta ? <p className="ob-review-timeline-date">{meta}</p> : null}
        </div>
        <p className="ob-review-timeline-desc">{description}</p>
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
  isComplete = false,
  onReupload,
}: {
  documents: Array<{
    id: string;
    documentName: string;
    latestSubmission: {
      fileUrl: string;
      status: OnboardingDocStatus;
      rejectionNote: string | null;
      submittedAt: string;
      reviewedAt: string | null;
    } | null;
  }>;
  allDocsApproved: boolean;
  isComplete?: boolean;
  onReupload?: () => void;
}) {
  const docsApproved = documents.filter((d) => d.latestSubmission?.status === "approved").length;
  const docsRejected = documents.filter((d) => d.latestSubmission?.status === "rejected").length;
  const docsTotal = documents.length;
  const submittedAt = documents
    .map((d) => d.latestSubmission?.submittedAt)
    .filter((date): date is string => Boolean(date))
    .sort()[0];
  const reviewedAt = documents
    .map((d) => d.latestSubmission?.reviewedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  const actionNeeded = docsRejected > 0;
  const activated = isComplete || allDocsApproved;
  const documentReviewState: TimelineStepState = actionNeeded ? "alert" : activated ? "complete" : "active";
  const activationState: TimelineStepState = activated ? "complete" : "pending";

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col">
      <section className={`ob-review-hero ${activated ? "ob-review-hero--success" : actionNeeded ? "ob-review-hero--warning" : ""}`}>
        {activated || actionNeeded ? (
          <span className="ob-review-hero-icon">
            {activated ? (
              <Check className="h-7 w-7" strokeWidth={2.4} aria-hidden="true" />
            ) : (
              <AlertCircle className="h-[26px] w-[26px]" strokeWidth={1.8} aria-hidden="true" />
            )}
          </span>
        ) : null}
        <h1>
          {activated
            ? "You're all set"
            : actionNeeded
              ? docsRejected === 1
                ? "One document needs your attention"
                : `${docsRejected} documents need your attention`
              : "Your account is under review"}
        </h1>
        <p>
          {activated
            ? "Your account is active. Head to your dashboard to get started."
            : actionNeeded
              ? "HR asked for a change before they can finish reviewing. Re-upload the document below to continue."
              : "HR is reviewing each of your documents. You'll get an email when there's an update — no need to wait here."}
        </p>
        {activated ? (
          <Button asChild size="lg" className="mt-6">
            <Link href="/">
              Go to dashboard
              <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </section>

      <section
        className="mt-5 rounded-2xl border border-[color:var(--border-primary)] bg-white p-8"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div>
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
            meta={activated ? formatReviewDateLabel(reviewedAt) : undefined}
            description={
              actionNeeded
                ? docsRejected === 1
                  ? "1 document needs changes before HR can continue."
                  : `${docsRejected} documents need changes before HR can continue.`
                : activated
                  ? "All documents approved by HR."
                  : docsTotal === 0
                ? "HR is reviewing your submission."
                : `HR is checking each document. ${docsApproved} of ${docsTotal} approved so far.`
            }
            isLast={false}
          />
          <ReviewTimelineStep
            state={activationState}
            title="Account activated"
            meta={activated ? "Today" : undefined}
            description={activated ? "Your Manage Jia account is ready." : "You'll get an email the moment your account is ready."}
            isLast
          />
        </div>

        {docsTotal > 0 ? (
          <div className="mt-2 border-t border-[color:var(--gray-100)] pt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="ob-review-section-title">Documents</p>
              <p className="text-xs leading-[18px] text-[color:var(--text-tertiary)]">
                {docsApproved} of {docsTotal} approved
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {documents.map((doc) => (
                <ReviewDocumentRow
                  key={doc.id}
                  documentName={doc.documentName}
                  filename={fileNameFromUrl(doc.latestSubmission?.fileUrl) ?? "—"}
                  status={doc.latestSubmission?.status ?? null}
                  hasStagedFile={false}
                  rejectionNote={doc.latestSubmission?.rejectionNote}
                  onReupload={doc.latestSubmission?.status === "rejected" ? onReupload : undefined}
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
  const [reviewActionDismissed, setReviewActionDismissed] = useState(false);

  const didInitStep = useRef(false);

  useEffect(() => {
    if (!status) return;
    if ((status.documents ?? []).every((d) => d.latestSubmission?.status !== "rejected")) {
      setReviewActionDismissed(false);
    }

    setFields(status.customFields ?? []);
    const profile = status.profile;
    setFirstName(profile.firstName ?? "");
    setMiddleName(profile.middleName ?? "");
    setLastName(profile.lastName ?? "");
    setPersonalEmail(profile.personalEmail ?? "");
    setAddress(profile.address?.address ?? "");
    setCity(profile.address?.city ?? "");
    setProvince(profile.address?.province ?? "");
    // PH-only deployment: default an empty country to Philippines so the address dropdowns resolve.
    setCountry(profile.address?.country?.trim() || "Philippines");
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

  function handleContinueFromProfile(): void {
    const next = profileDraftErrors(profileDraft);
    if (Object.keys(next).length === 0 && !isStrictPhilippineMobile(emergencyContact)) {
      next.emergencyContact = "Enter an 11-digit mobile number starting with 09.";
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
    if (!isStrictPhilippineMobile(emergencyContact)) {
      setProfileErrors({ emergencyContact: "Enter an 11-digit mobile number starting with 09." });
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

  if (status === null) {
    return (
      <div className="mx-auto w-full max-w-[960px]">
        <div
          className="rounded-2xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: CARD_SHADOW }}
        >
          <EmptyState
            icon={CheckCircle2}
            title="No onboarding in progress"
            body="Your onboarding hasn't started yet. Check back later."
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
  const docsRejected = documents.filter((d) => d.latestSubmission?.status === "rejected").length;
  const stagedCount = Object.keys(pendingFiles).length;
  const docsUploaded = documents.filter((d) => {
    const s = docStatus(d.id);
    return s === "pending" || s === "approved" || Boolean(pendingFiles[d.id]);
  }).length;
  const docsToUpload = documents.length - docsUploaded;
  const docsDone = documents.length === 0 || documents.every((d) => documentIsReady(d.id));
  const allDocsApproved = documents.length > 0 && documents.every((d) => docStatus(d.id) === "approved");
  const actionNeeded =
    profileDone && docsRejected > 0 && stagedCount === 0 && !status.isComplete && !reviewActionDismissed;

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

  // Return visits after submission: HR review, action needed, or activated.
  if (status.isComplete || actionNeeded || (submitted && !hasSubmitted)) {
    return (
      <AccountUnderReviewStatus
        documents={documents}
        allDocsApproved={allDocsApproved}
        isComplete={status.isComplete}
        onReupload={() => {
          setReviewActionDismissed(true);
          setStep(3);
        }}
      />
    );
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
        <ProgressSteps items={progressSteps} className="mx-auto mb-6 max-w-[600px]" />

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
              <div className="flex flex-col gap-4">
                <PhAddressFields
                  idPrefix="ob"
                  required
                  value={{ country, province, city, address }}
                  errors={{
                    address: visibleProfileErrors.address,
                    country: visibleProfileErrors.country,
                    province: visibleProfileErrors.province,
                    city: visibleProfileErrors.city,
                  }}
                  onTouch={touchProfileField}
                  onChange={(patch) => {
                    if (patch.address !== undefined) setAddress(patch.address);
                    if (patch.country !== undefined) setCountry(patch.country);
                    if (patch.province !== undefined) setProvince(patch.province);
                    if (patch.city !== undefined) setCity(patch.city);
                  }}
                />
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
                        rejectionNote={doc.latestSubmission?.rejectionNote}
                        onReupload={() => goStep(3)}
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
