"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  PartyPopper,
  FileText,
  User,
  MessageSquare,
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
  OnboardingProfile,
} from "@/modules/people/onboarding/types/onboarding.types";
import { DocumentUploadRow } from "@/modules/people/onboarding/components/documents/document-upload";

import { queryKeys } from "@/shared/lib/query-keys";
import { cn } from "@/shared/lib/utils";
import { isValidPhilippinePhone, toE164 } from "@/shared/lib/phone";

import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { DatePicker } from "@/shared/ui/primitives/date-picker";
import { PhoneInput } from "@/shared/ui/primitives/phone-input-lazy";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_LABELS = ["Your details", "Quick questions", "Documents", "Overview"] as const;
const CARD_SHADOW = "inset 0 0 2px 0 rgba(0,16,53,.16), 0 1px 2px 0 rgba(14,16,27,.05)";

type MarkerState = "done" | "current" | "upcoming";

// ─── pure helpers ─────────────────────────────────────────────────────────────

function profileComplete(p: OnboardingProfile): boolean {
  return (
    Boolean(p.firstName?.trim()) &&
    Boolean(p.lastName?.trim()) &&
    Boolean(p.personalEmail?.trim()) &&
    Boolean(p.birthday) &&
    Boolean(p.address?.address?.trim()) &&
    Boolean(p.emergencyContact?.emergencyContactNumber?.trim())
  );
}

function fieldsComplete(fields: OnboardingCustomFieldStatus[]): boolean {
  return fields.length === 0 || fields.every((f) => (f.value ?? "").trim() !== "");
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

function StepMarker({ n, state }: { n: number; state: MarkerState }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold transition-colors",
        state === "done"
          ? "border-[color:var(--color-success-600)] bg-[color:var(--color-success-600)] text-white"
          : state === "current"
            ? "border-[color:var(--gray-900)] bg-[color:var(--gray-900)] text-white"
            : "border-[color:var(--border-secondary)] bg-white text-[color:var(--text-tertiary)]",
      )}
    >
      {state === "done" ? <Check className="h-[15px] w-[15px]" strokeWidth={2.6} aria-hidden="true" /> : n}
    </span>
  );
}

function Stepper({
  markerState,
  onGo,
}: {
  markerState: (n: number) => MarkerState;
  onGo: (n: number) => void;
}) {
  return (
    <div className="mx-auto mb-10 flex max-w-[640px] flex-wrap items-center justify-center gap-x-3 gap-y-2">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        return (
          <Fragment key={label}>
            <button
              type="button"
              onClick={() => onGo(n)}
              className="flex items-center gap-2.5 rounded-lg px-0.5 py-1"
            >
              <StepMarker n={n} state={markerState(n)} />
              <span className="hidden whitespace-nowrap text-sm font-medium text-[color:var(--text-secondary)] min-[560px]:inline">
                {label}
              </span>
            </button>
            {n < STEP_LABELS.length && (
              <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--gray-300)]" strokeWidth={2} aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

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
      <h2 className="text-xl font-bold tracking-[-0.01em] text-[color:var(--text-primary)]">{title}</h2>
      <p className="mt-1.5 text-sm text-[color:var(--text-tertiary)]">{subtitle}</p>
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

function RecapRow({
  icon: Icon,
  label,
  value,
  actionLabel,
  onAction,
  last,
}: {
  icon: typeof User;
  label: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
  last?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3.5 px-[18px] py-4", !last && "border-b border-[color:var(--border-primary)]")}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)]">
        <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium text-[color:var(--text-tertiary)]">{label}</span>
        <span className="truncate text-sm font-medium text-[color:var(--text-primary)]">{value}</span>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 text-sm font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]"
      >
        {actionLabel}
      </button>
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
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [finishing, setFinishing] = useState(false);

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

  async function handleSaveProfile(): Promise<void> {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!EMAIL_RE.test(personalEmail.trim())) next.personalEmail = "Enter a valid personal email.";
    if (!birthday) next.birthday = "Birthday is required.";
    else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(birthday);
      selected.setHours(0, 0, 0, 0);
      if (selected > today) next.birthday = "Birthday cannot be in the future.";
    }
    if (!address.trim()) next.address = "Street address is required.";
    if (!city.trim()) next.city = "City is required.";
    if (!province.trim()) next.province = "Province is required.";
    if (!country.trim()) next.country = "Country is required.";
    if (!emergencyContactName.trim()) next.emergencyContactName = "Contact name is required.";
    if (!emergencyContact.trim()) {
      next.emergencyContact = "Contact number is required.";
    } else if (!(await isValidPhilippinePhone(emergencyContact))) {
      next.emergencyContact = "Enter a valid Philippine mobile number.";
    }
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;

    // Nothing edited — HR's pre-filled details are already valid and saved, so
    // skip the network round-trip and just move on.
    const p = status?.profile;
    const unchanged =
      p != null &&
      firstName.trim() === (p.firstName ?? "").trim() &&
      (middleName.trim() || "") === (p.middleName ?? "").trim() &&
      lastName.trim() === (p.lastName ?? "").trim() &&
      personalEmail.trim() === (p.personalEmail ?? "").trim() &&
      format(birthday!, "yyyy-MM-dd") === (p.birthday ?? "") &&
      address.trim() === (p.address?.address ?? "").trim() &&
      city.trim() === (p.address?.city ?? "").trim() &&
      province.trim() === (p.address?.province ?? "").trim() &&
      country.trim() === (p.address?.country ?? "").trim() &&
      emergencyContactName.trim() === (p.emergencyContact?.emergencyContactName ?? "").trim() &&
      emergencyContact.trim() === (p.emergencyContact?.emergencyContactNumber ?? "").trim();
    if (unchanged) {
      setStep(2);
      return;
    }

    updateProfile.mutate(
      {
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
      },
      {
        onSuccess: () => {
          toast.success("Your details were saved.");
          setStep(2);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not save your details."),
      },
    );
  }

  function handleContinueFromFields(): void {
    if (fields.length === 0) {
      setStep(3);
      return;
    }
    const filled = fields.filter((f) => (f.value ?? "").trim() !== "");
    if (filled.length === 0) {
      if (fields.some((f) => f.isRequired)) {
        toast.error("Please answer the required question(s).");
        return;
      }
      setStep(3);
      return;
    }
    submitFields.mutate(
      filled.map((f) => ({ fieldId: f.id, value: (f.value ?? "").trim() })),
      {
        onSuccess: () => {
          toast.success("Saved.");
          setStep(3);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your answers."),
      },
    );
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
    if (!profileComplete(status.profile)) {
      toast.error("Save your personal details before submitting.");
      setStep(1);
      return;
    }
    if (!fieldsComplete(status.customFields ?? [])) {
      toast.error("Answer the quick questions before submitting.");
      setStep(2);
      return;
    }

    setFinishing(true);
    try {
      for (const [documentId, file] of Object.entries(pendingFiles)) {
        await submitDocument(documentId, file);
      }
      await submitForReview.mutateAsync();
      setPendingFiles({});
      await queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.mine });
      toast.success("Submitted to HR — they'll review your documents and activate your account.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Some items are still incomplete.");
    } finally {
      setFinishing(false);
    }
  }

  // ── non-wizard states ──
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <OnboardingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[720px]">
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
      <div className="mx-auto w-full max-w-[720px]">
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

  const personalDetailsDone = profileComplete(profile);
  const savedFieldsDone = fieldsComplete(status.customFields ?? []);
  const profileDone = personalDetailsDone && savedFieldsDone;

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
  const submitted = awaitingHrReview || awaitingHrActivation;
  const canSubmitToHr = profileDone && docsDone && !status.isComplete && !submitted;

  const markerState = (n: number): MarkerState => {
    const done =
      n === 1 ? personalDetailsDone : n === 2 ? savedFieldsDone : n === 3 ? docsDone : submitted;
    if (done && step !== n) return "done";
    if (step === n) return "current";
    return "upcoming";
  };

  const filledFields = fields.filter((f) => (f.value ?? "").trim() !== "").length;
  const detailsValue = [`${firstName} ${lastName}`.trim(), profile.jobTitle]
    .filter(Boolean)
    .join(" · ");
  const fieldsValue =
    fields.length === 0
      ? "No questions to answer"
      : filledFields === fields.length
        ? `${fields.length} answered`
        : `${filledFields} of ${fields.length} answered`;
  const docsValue = `${docsUploaded} of ${documents.length} uploaded`;

  const goStep = (n: number) => setStep(n);
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="mx-auto w-full max-w-[720px]">
      {/* Welcome */}
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-medium leading-8 text-[color:var(--text-primary)] [text-wrap:pretty]">
          Welcome aboard{profile.firstName ? `, ${profile.firstName}` : ""}.
        </h1>
        <p className="text-base text-[color:var(--text-tertiary)] [text-wrap:pretty]">
          Your progress saves as you go, finish anytime.
        </p>
      </div>

      <Stepper markerState={markerState} onGo={goStep} />

      {/* ── Step 1 — Your details ── */}
      {step === 1 && (
        <StepCard
          title="Confirm your details"
          subtitle="HR filled these in. Check them and fix anything that's off."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" required htmlFor="ob-first" error={profileErrors.firstName}>
              <Input
                id="ob-first"
                value={firstName}
                error={Boolean(profileErrors.firstName)}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormField>
            <FormField label="Middle name" htmlFor="ob-middle">
              <Input id="ob-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </FormField>
            <FormField label="Last name" required htmlFor="ob-last" error={profileErrors.lastName}>
              <Input
                id="ob-last"
                value={lastName}
                error={Boolean(profileErrors.lastName)}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormField>
            <FormField
              label="Personal email"
              required
              htmlFor="ob-personal-email"
              error={profileErrors.personalEmail}
            >
              <Input
                id="ob-personal-email"
                type="email"
                value={personalEmail}
                error={Boolean(profileErrors.personalEmail)}
                onChange={(e) => setPersonalEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Birthday" required htmlFor="ob-birthday" error={profileErrors.birthday}>
              <DatePicker disableFuture value={birthday} onChange={setBirthday} className="w-full" />
            </FormField>
            <div className="hidden sm:block" aria-hidden="true" />

            <div className="border-t border-[color:var(--border-primary)] pt-4 sm:col-span-2">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Address
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  label="Street address"
                  required
                  htmlFor="ob-address"
                  error={profileErrors.address}
                  className="sm:col-span-3"
                >
                  <Input
                    id="ob-address"
                    value={address}
                    error={Boolean(profileErrors.address)}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/unit no., street, barangay"
                  />
                </FormField>
                <FormField
                  label="Country"
                  required
                  htmlFor="ob-country"
                  error={profileErrors.country}
                >
                  <Input
                    id="ob-country"
                    value={country}
                    error={Boolean(profileErrors.country)}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </FormField>
                <FormField label="Province" required htmlFor="ob-province" error={profileErrors.province}>
                  <Input
                    id="ob-province"
                    value={province}
                    error={Boolean(profileErrors.province)}
                    onChange={(e) => setProvince(e.target.value)}
                  />
                </FormField>
                <FormField label="City" required htmlFor="ob-city" error={profileErrors.city}>
                  <Input
                    id="ob-city"
                    value={city}
                    error={Boolean(profileErrors.city)}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            <div className="border-t border-[color:var(--border-primary)] pt-4 sm:col-span-2">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Emergency contact
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Contact name"
                  required
                  htmlFor="ob-emergency-name"
                  error={profileErrors.emergencyContactName}
                >
                  <Input
                    id="ob-emergency-name"
                    value={emergencyContactName}
                    error={Boolean(profileErrors.emergencyContactName)}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. Juan Santos"
                  />
                </FormField>
                <FormField
                  label="Contact number"
                  required
                  htmlFor="ob-emergency"
                  error={profileErrors.emergencyContact}
                >
                  <PhoneInput
                    id="ob-emergency"
                    value={emergencyContact}
                    onChange={setEmergencyContact}
                    error={Boolean(profileErrors.emergencyContact)}
                    placeholder="Enter phone number"
                  />
                </FormField>
              </div>
            </div>

            <div className="border-t border-[color:var(--border-primary)] pt-4 sm:col-span-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Job title" htmlFor="ob-job">
                  <Input id="ob-job" value={profile.jobTitle ?? ""} readOnly disabled />
                </FormField>
                <FormField label="Department" htmlFor="ob-dept">
                  <Input id="ob-dept" value={profile.department ?? ""} readOnly disabled />
                </FormField>
              </div>
              <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
                Your job title and department are set by HR. Reach out to them if something looks wrong.
              </p>
            </div>
          </div>

          <PrivacyNote>
            Your personal details are private. Only you, HR, and admins can see them.
          </PrivacyNote>

          <div className="mt-7 flex justify-end">
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Continue"}
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
            <div className={fields.length === 1 ? "max-w-[340px]" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
              {fields.map((field, idx) => {
                const fieldId = `custom-field-${field.id}`;
                return (
                  <FormField
                    key={field.id}
                    label={field.fieldLabel}
                    required={field.isRequired}
                    htmlFor={fieldId}
                  >
                    <Input
                      id={fieldId}
                      value={field.value ?? ""}
                      onChange={(e) => {
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
            <Button onClick={handleContinueFromFields} disabled={submitFields.isPending}>
              {submitFields.isPending ? "Saving…" : "Continue"}
            </Button>
          </div>
        </StepCard>
      )}

      {/* ── Step 3 — Documents ── */}
      {step === 3 && (
        <StepCard
          title="Upload your documents"
          subtitle="HR reviews each one. You can upload them whenever you have them ready."
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

          <PrivacyNote>Your documents are private and only shared with HR for review.</PrivacyNote>

          <div className="mt-7 flex items-center justify-between">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
          </div>
        </StepCard>
      )}

      {/* ── Step 4 — Overview ── */}
      {step === 4 && (
        <StepCard title="Overview" subtitle="Here's everything before HR takes over.">
          <div className="overflow-hidden rounded-xl border border-[color:var(--border-primary)]">
            <RecapRow
              icon={User}
              label="Your details"
              value={detailsValue || "—"}
              actionLabel="Edit"
              onAction={() => goStep(1)}
            />
            <RecapRow
              icon={MessageSquare}
              label="Quick questions"
              value={fieldsValue}
              actionLabel="Edit"
              onAction={() => goStep(2)}
            />
            <RecapRow
              icon={FileText}
              label="Documents"
              value={docsValue}
              actionLabel="Manage"
              onAction={() => goStep(3)}
              last
            />
          </div>

          {submitted ? (
            <div className="mt-5 flex gap-3.5 rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCFAE6] text-[#067647]">
                <CheckCircle2 className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[color:var(--text-primary)]">
                  You&apos;ve done your part
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-tertiary)] [text-wrap:pretty]">
                  {awaitingHrActivation
                    ? "All your documents are approved. HR will activate your account shortly — we'll email you the moment you're in."
                    : "HR is now reviewing your documents. We'll email you the moment your account is active. Welcome aboard."}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex gap-3.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--border-secondary)] bg-[color:var(--bg-secondary)] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-primary)] bg-white text-[color:var(--text-tertiary)]">
                <Mail className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[color:var(--text-primary)]">
                  HR review &amp; activation
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-tertiary)] [text-wrap:pretty]">
                  Once your documents are in, HR reviews them and activates your account. We&apos;ll email
                  you the moment you&apos;re in.
                </p>
              </div>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <Button variant="secondary" onClick={back}>
              Back
            </Button>
            {canSubmitToHr && (
              <Button
                onClick={() => void handleSubmitForReview()}
                disabled={finishing || submitForReview.isPending}
              >
                {finishing || submitForReview.isPending ? "Submitting…" : "Submit to HR"}
              </Button>
            )}
          </div>
        </StepCard>
      )}
    </div>
  );
}
