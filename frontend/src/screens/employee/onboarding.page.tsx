"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  PartyPopper,
  FileText,
  Pencil,
  Save,
} from "lucide-react";

import { useAuth } from "@/modules/auth/hooks/use-auth";
import {
  useMyOnboarding,
  useSubmitCustomFields,
  useSubmitMyOnboardingForReview,
  useUpdateMyProfile,
} from "@/modules/people/onboarding/hooks/use-my-onboarding";
import {
  submitDocument,
} from "@/modules/people/onboarding/services/onboarding.service";
import type { OnboardingCustomFieldStatus } from "@/modules/people/onboarding/types/onboarding.types";
import { DocumentUploadRow } from "@/modules/people/onboarding/components/documents/document-upload";

import { queryKeys } from "@/shared/lib/query-keys";

import { ProgressBar } from "@/shared/ui/patterns/progress-bar";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";
import { EmptyState } from "@/shared/ui/patterns/empty-state";
import { FormField } from "@/shared/ui/patterns/form-field";
import { PageSection } from "@/shared/ui/patterns/page-section";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { DatePicker } from "@/shared/ui/primitives/date-picker";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  "Review your details",
  "Complete your profile",
  "Upload your documents",
  "HR review & activation",
] as const;

function OnboardingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[88px] w-full rounded-xl" />
      <Skeleton className="h-[120px] w-full rounded-xl" />
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
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
              <span
                className="mx-1 hidden h-px w-5 bg-[color:var(--border-secondary)] sm:block"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-[color:var(--border-primary)] py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-[13px] font-medium text-[color:var(--text-primary)]">{value || "—"}</span>
    </div>
  );
}

export default function EmployeeOnboardingPage() {
  const { appUser } = useAuth();
  const queryClient = useQueryClient();

  const isEmployee = appUser?.role === "EMPLOYEE";
  const { status, loading, error, reload } = useMyOnboarding(isEmployee);
  const submitFields = useSubmitCustomFields();
  const updateProfile = useUpdateMyProfile();
  const submitForReview = useSubmitMyOnboardingForReview();

  const [fields, setFields] = useState<OnboardingCustomFieldStatus[]>([]);
  const [customFieldsEditing, setCustomFieldsEditing] = useState(true);
  const [profileEditing, setProfileEditing] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [birthday, setBirthday] = useState<Date | undefined>();
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (status) {
      setFields(status.customFields ?? []);
      const allFilled = (status.customFields ?? []).every((f) => (f.value ?? "").trim() !== "");
      setCustomFieldsEditing(!allFilled);

      const profile = status.profile;
      setFirstName(profile.firstName ?? "");
      setMiddleName(profile.middleName ?? "");
      setLastName(profile.lastName ?? "");
      setPersonalEmail(profile.personalEmail ?? "");
      setAddress(profile.address ?? "");
      setEmergencyContact(profile.emergencyContact ?? "");
      setBirthday(profile.birthday ? new Date(`${profile.birthday}T00:00:00`) : undefined);

      const profileComplete =
        Boolean(profile.firstName?.trim()) &&
        Boolean(profile.lastName?.trim()) &&
        Boolean(profile.personalEmail?.trim()) &&
        Boolean(profile.birthday) &&
        Boolean(profile.address?.trim()) &&
        Boolean(profile.emergencyContact?.trim());
      setProfileEditing(!profileComplete);
    }
  }, [status]);

  function handleSaveProfile() {
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
    if (!address.trim()) next.address = "Address is required.";
    if (!emergencyContact.trim()) next.emergencyContact = "Emergency contact is required.";
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;

    updateProfile.mutate(
      {
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim(),
        personalEmail: personalEmail.trim(),
        birthday: birthday!.toISOString().slice(0, 10),
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Your details were saved.");
          setProfileEditing(false);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not save your details."),
      },
    );
  }

  function handleSaveFields() {
    const answers = fields
      .filter((f) => (f.value ?? "").trim() !== "")
      .map((f) => ({ fieldId: f.id, value: (f.value ?? "").trim() }));
    if (answers.length === 0) {
      toast.error("Fill in at least one field before saving.");
      return;
    }
    submitFields.mutate(answers, {
      onSuccess: () => {
        toast.success("Profile details saved");
        setCustomFieldsEditing(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your details."),
    });
  }

  function handleSelectDocument(documentId: string, file: File) {
    setPendingFiles((prev) => ({ ...prev, [documentId]: file }));
  }

  function handleRemoveDocument(documentId: string) {
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
  }

  async function handleSubmitForReview() {
    if (profileEditing) {
      toast.error("Save your personal details before submitting.");
      return;
    }

    const filledFields = fields.filter((f) => (f.value ?? "").trim() !== "").length;
    const customFieldsComplete = fields.length === 0 || filledFields === fields.length;
    if (!customFieldsComplete) {
      toast.error("Save your custom profile fields before submitting.");
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
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
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
      <div>
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
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

  const { profile } = status;
  const documents = status.documents ?? [];
  const filledFields = fields.filter((f) => (f.value ?? "").trim() !== "").length;
  const personalDetailsDone = !profileEditing;
  const customFieldsDone = fields.length === 0 || filledFields === fields.length;
  const profileDone = personalDetailsDone && customFieldsDone;

  const docStatus = (docId: string) =>
    documents.find((d) => d.id === docId)?.latestSubmission?.status ?? null;

  function documentIsReady(docId: string) {
    const submissionStatus = docStatus(docId);
    if (submissionStatus === "pending" || submissionStatus === "approved") return true;
    return Boolean(pendingFiles[docId]);
  }

  const docsToUpload = documents.filter((d) => {
    const s = d.latestSubmission?.status ?? null;
    return (s === null || s === "rejected") && !pendingFiles[d.id];
  }).length;
  const docsInReview = documents.filter((d) => d.latestSubmission?.status === "pending").length;
  const docsApproved = documents.filter((d) => d.latestSubmission?.status === "approved").length;
  const stagedCount = Object.keys(pendingFiles).length;
  const docsDone = documents.length === 0 || documents.every((d) => documentIsReady(d.id));
  const allDocsApproved =
    documents.length > 0 && documents.every((d) => docStatus(d.id) === "approved");
  const awaitingHrReview =
    profileDone &&
    docsDone &&
    stagedCount === 0 &&
    docsToUpload === 0 &&
    docsInReview > 0 &&
    !allDocsApproved &&
    !status.isComplete;
  const awaitingHrActivation = allDocsApproved && !status.isComplete;
  const canSubmitToHr =
    profileDone && docsDone && !status.isComplete && !awaitingHrReview && !awaitingHrActivation;

  const currentStep = !profileDone ? 2 : !docsDone ? 3 : 4;

  const totalUnits = fields.length + documents.length || 1;
  const doneUnits = filledFields + docsApproved + docsInReview * 0.5 + stagedCount * 0.75;
  const progress = Math.round((doneUnits / totalUnits) * 100);

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
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

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <h2 className="text-sm font-bold text-[color:var(--text-primary)]">
          What&apos;s left before you&apos;re active
        </h2>
        <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
          {awaitingHrActivation
            ? "All documents approved — HR will activate your account soon."
            : awaitingHrReview
              ? "Your onboarding is with HR for review."
              : canSubmitToHr
                ? "Everything's in — submit to HR when you're ready."
                : "Finish the items below to send your onboarding to HR."}
        </p>
        <ul className="mt-3 divide-y divide-[color:var(--border-primary)]">
          <ChecklistRow
            state={profileDone ? "done" : "todo"}
            label="Complete your profile"
            detail={
              profileDone
                ? "Personal details and custom fields saved."
                : !personalDetailsDone
                  ? "Confirm your personal details first."
                  : `${fields.length - filledFields} of ${fields.length} custom field(s) still need a value.`
            }
          />
          <ChecklistRow
            state={docsDone ? "done" : "todo"}
            label="Upload your documents"
            detail={
              docsDone
                ? stagedCount > 0
                  ? `${stagedCount} file(s) ready — uploads when you finish.`
                  : "All documents uploaded."
                : `${docsToUpload} document(s) still to upload.`
            }
          />
          <ChecklistRow
            state={
              docsApproved === documents.length && documents.length > 0
                ? "done"
                : docsInReview > 0
                  ? "waiting"
                  : "todo"
            }
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

        {canSubmitToHr && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[color:var(--text-primary)]">
                Submit to HR
              </p>
              <p className="text-[12px] text-[color:var(--text-tertiary)]">
                HR will review your documents before your account is activated.
              </p>
            </div>
            <Button
              onClick={() => void handleSubmitForReview()}
              disabled={finishing || submitForReview.isPending}
              className="shrink-0"
            >
              {finishing || submitForReview.isPending ? "Submitting…" : "Submit to HR"}
            </Button>
          </div>
        )}

        {awaitingHrReview && (
          <div className="mt-4 rounded-lg border border-[#B2DDFF] bg-[#EFF8FF] p-4">
            <p className="text-[13px] font-semibold text-[#175CD3]">Waiting for HR review</p>
            <p className="mt-1 text-[12px] text-[#1849A9]">
              HR is reviewing your documents. If any are rejected, you can re-upload them here.
            </p>
          </div>
        )}

        {awaitingHrActivation && (
          <div className="mt-4 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3] p-4">
            <p className="text-[13px] font-semibold text-[#067647]">Documents approved</p>
            <p className="mt-1 text-[12px] text-[#067647]">
              HR will mark your onboarding complete and activate your account.
            </p>
          </div>
        )}
      </div>

      <PageSection
        title="Review your details"
        description="Your HR team pre-filled these. Update anything that needs correcting, then save."
      >
        <div
          className="relative rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {profileEditing ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="First name *" htmlFor="ob-first" error={profileErrors.firstName}>
                  <Input id="ob-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </FormField>
                <FormField label="Middle name" htmlFor="ob-middle">
                  <Input id="ob-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                </FormField>
                <FormField label="Last name *" htmlFor="ob-last" error={profileErrors.lastName}>
                  <Input id="ob-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </FormField>
                <FormField
                  label="Personal email *"
                  htmlFor="ob-personal-email"
                  error={profileErrors.personalEmail}
                >
                  <Input
                    id="ob-personal-email"
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                  />
                </FormField>
                <FormField label="Birthday *" htmlFor="ob-birthday" error={profileErrors.birthday}>
                  <DatePicker
                    disableFuture
                    value={birthday}
                    onChange={setBirthday}
                    className="w-full"
                  />
                </FormField>
                <FormField label="Job title" htmlFor="ob-job">
                  <Input id="ob-job" value={profile.jobTitle ?? ""} disabled />
                </FormField>
                <FormField label="Department" htmlFor="ob-dept">
                  <Input id="ob-dept" value={profile.department ?? ""} disabled />
                </FormField>
                <FormField label="Address *" htmlFor="ob-address" error={profileErrors.address} className="sm:col-span-2">
                  <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </FormField>
                <FormField
                  label="Emergency contact *"
                  htmlFor="ob-emergency"
                  error={profileErrors.emergencyContact}
                  className="sm:col-span-2"
                >
                  <Input
                    id="ob-emergency"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Name - phone number"
                  />
                </FormField>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                  <Save aria-hidden="true" />
                  {updateProfile.isPending ? "Saving…" : "Save details"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8"
                aria-label="Edit personal details"
                onClick={() => setProfileEditing(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="px-0">
                <ReviewRow label="Full name" value={[firstName, middleName, lastName].filter(Boolean).join(" ")} />
                <ReviewRow label="Personal email" value={personalEmail} />
                <ReviewRow label="Job title" value={profile.jobTitle ?? ""} />
                <ReviewRow label="Department" value={profile.department ?? ""} />
                <ReviewRow
                  label="Birthday"
                  value={birthday ? birthday.toLocaleDateString("en-US") : ""}
                />
                <ReviewRow label="Address" value={address} />
                <ReviewRow label="Emergency contact" value={emergencyContact} />
              </div>
            </>
          )}
        </div>
      </PageSection>

      <PageSection
        title="Additional profile fields"
        description="Fill in any extra questions from HR and save when done."
      >
        <div
          className="relative rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {fields.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="No fields to fill"
              body="Your HR team hasn't added any custom fields yet."
            />
          ) : customFieldsEditing ? (
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
                  <Save aria-hidden="true" />
                  {submitFields.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8"
                aria-label="Edit custom fields"
                onClick={() => setCustomFieldsEditing(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.id} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[color:var(--text-secondary)]">
                      {field.fieldLabel}
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {field.value?.trim() ? field.value : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </PageSection>

      <PageSection
        title="Upload your documents"
        description="Upload each required document from your device for HR review."
      >
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
                <DocumentUploadRow
                  key={doc.id}
                  id={doc.id}
                  name={doc.documentName}
                  instructions={doc.instructions}
                  allowedFileTypes={doc.allowedFileTypes}
                  rejectionNote={doc.latestSubmission?.rejectionNote ?? null}
                  status={docStatus(doc.id)}
                  selectedFile={pendingFiles[doc.id] ?? null}
                  onSelect={(file) => handleSelectDocument(doc.id, file)}
                  onRemove={() => handleRemoveDocument(doc.id)}
                />
              ))}
            </div>
          )}
        </div>
      </PageSection>
    </div>
  );
}
