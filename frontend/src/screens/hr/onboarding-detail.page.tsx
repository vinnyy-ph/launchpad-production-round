"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, Mail, CheckCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePageBreadcrumb } from "@/shared/components/layout/breadcrumb-context";
import { Button, Separator, Skeleton, Input, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, FormField } from "@/shared/ui";
import { EmptyState, ErrorState, StatusBadge, ConfirmProvider, useConfirm } from "@/shared/ui/patterns";
import { DocumentReviewCard } from "@/modules/people/onboarding/components/documents/document-review-card";
import { ApproveDocumentDialog } from "@/modules/people/onboarding/components/documents/approve-document-dialog";
import { RejectDocumentDialog } from "@/modules/people/onboarding/components/documents/reject-document-dialog";
import { InviteStatusBadge } from "@/modules/people/onboarding/components/invite-status-badge";
import { useOnboardingRecord } from "@/modules/people/onboarding/hooks/use-onboarding-record";
import { useApproveDocument, useRejectDocument } from "@/modules/people/onboarding/hooks/use-review-document";
import { useCompleteOnboarding } from "@/modules/people/onboarding/hooks/use-complete-onboarding";
import { useInvitationStatus, useResendInvite, useSendInvite, useUpdateInvitationEmail } from "@/modules/people/onboarding/hooks/use-invitation";
import type { DocumentReview } from "@/modules/people/onboarding/types/onboarding.types";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-48 sm:flex-shrink-0">
        {label}
      </span>
      <span className="min-w-0 break-words text-sm text-[color:var(--text-primary)]">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

function OnboardingDetailInner() {
  const params = useParams();
  const router = useRouter();
  const employeeId =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const confirm = useConfirm();

  const { employee, documentConfigs, customFieldConfigs, reviews, status, loading, error, reload } =
    useOnboardingRecord(employeeId);
  const approve = useApproveDocument();
  const reject = useRejectDocument();
  const complete = useCompleteOnboarding();
  const invite = useSendInvite();
  const resend = useResendInvite();
  const updateEmail = useUpdateInvitationEmail();

  const recordId = status?.recordId ?? reviews.find((r) => r.employee.id === employeeId)?.recordId ?? null;
  const { latestInvitation, reload: reloadInvitation } = useInvitationStatus(recordId);

  usePageBreadcrumb(employee ? [employee.fullName] : []);

  const [rejectTarget, setRejectTarget] = useState<DocumentReview | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approveTarget, setApproveTarget] = useState<DocumentReview | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmailError, setInviteEmailError] = useState<string | undefined>();

  const submissionsByDoc = useMemo(() => {
    const mine = reviews
      .filter((r) => r.employee.id === employeeId)
      .sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));
    const map = new Map<string, DocumentReview>();
    for (const r of mine) map.set(r.documentId, r);
    return map;
  }, [reviews, employeeId]);

  const customFields = useMemo(
    () =>
      status?.customFields ??
      customFieldConfigs.map((f) => ({
        id: f.id,
        fieldLabel: f.fieldLabel,
        isRequired: f.isRequired,
        value: null as string | null,
      })),
    [status, customFieldConfigs],
  );

  const profile = status?.profile;
  const invitationStatus = status?.invitationStatus ?? latestInvitation?.status ?? null;

  function submitApprove() {
    if (!approveTarget) return;
    approve.mutate(approveTarget.id, {
      onSuccess: () => {
        toast.success(`"${approveTarget.documentName}" approved.`);
        setApproveTarget(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not approve document."),
    });
  }

  function submitReject() {
    if (!rejectTarget) return;
    if (!rejectNote.trim()) {
      toast.error("Add a note explaining the rejection.");
      return;
    }
    reject.mutate(
      { submissionId: rejectTarget.id, rejectionNote: rejectNote.trim() },
      {
        onSuccess: () => {
          toast.success(`"${rejectTarget.documentName}" rejected.`);
          setRejectTarget(null);
          setRejectNote("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not reject document."),
      },
    );
  }

  async function handleComplete() {
    const ok = await confirm({
      title: "Mark onboarding complete?",
      description: "This activates the employee once all required documents are approved.",
      confirmLabel: "Mark complete",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    complete.mutate(employeeId, {
      onSuccess: () => {
        toast.success("Onboarding complete — employee is now Active.");
        reload();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Onboarding is not ready to complete."),
    });
  }

  function handleSendInvite() {
    if (!recordId) {
      toast.error("No invitation record found for this employee yet.");
      return;
    }
    invite.mutate(recordId, {
      onSuccess: () => toast.success("Invitation sent."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send invitation."),
    });
  }

  function handleResendInvite() {
    const invitationId = latestInvitation?.id;
    if (!invitationId) {
      handleSendInvite();
      return;
    }
    resend.mutate(invitationId, {
      onSuccess: () => {
        toast.success("Invitation resent.");
        void reloadInvitation();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not resend invitation."),
    });
  }

  function openEmailDialog() {
    setInviteEmail(latestInvitation?.sentToEmail ?? employee?.companyEmail ?? "");
    setInviteEmailError(undefined);
    setEmailDialogOpen(true);
  }

  function handleUpdateInviteEmail() {
    const invitationId = latestInvitation?.id;
    if (!invitationId) {
      toast.error("No invitation found to update.");
      return;
    }
    if (!EMAIL_RE.test(inviteEmail.trim())) {
      setInviteEmailError("Enter a valid email address.");
      return;
    }
    updateEmail.mutate(
      { invitationId, input: { email: inviteEmail.trim() } },
      {
        onSuccess: () => {
          toast.success("Invitation email updated and resent.");
          setEmailDialogOpen(false);
          void reloadInvitation();
          reload();
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not update the invitation email."),
      },
    );
  }

  if (loading) {
    return (
      <div>
        <DetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  if (employee === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          icon={ClipboardList}
          title="Employee not found"
          body="This onboarding case does not exist or has been removed."
          action={{ label: "Back to Onboarding", onClick: () => router.push("/hr/directory/onboarding") }}
        />
      </div>
    );
  }

  const employeeName = employee.fullName;
  const isComplete = employee.status === "active";
  const allRequiredDocsApproved =
    documentConfigs.length === 0 ||
    documentConfigs
      .filter((doc) => doc.isRequired)
      .every((doc) => submissionsByDoc.get(doc.id)?.status === "approved");
  const canEditInviteEmail =
    !isComplete && latestInvitation != null && invitationStatus !== "accepted";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <PageHeader level="page" title={employeeName} subtitle={employee.companyEmail} />
          <div className="-mt-4 flex items-center gap-3">
            <StatusBadge status={employee.status} dot />
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {!isComplete && recordId && (
              <Button
                variant="outline"
                onClick={handleResendInvite}
                disabled={invite.isPending || resend.isPending}
              >
                <Mail aria-hidden="true" />
                {invite.isPending || resend.isPending ? "Sending…" : "Resend invite"}
              </Button>
            )}
            {!isComplete && (
              <Button onClick={handleComplete} disabled={complete.isPending || !allRequiredDocsApproved}>
                <CheckCircle2 aria-hidden="true" />
                {complete.isPending ? "Completing…" : "Mark complete"}
              </Button>
            )}
          </div>
          {!isComplete && !allRequiredDocsApproved && documentConfigs.some((d) => d.isRequired) && (
            <p className="text-[11px] text-[color:var(--text-tertiary)] sm:text-right">
              Approve all required documents first.
            </p>
          )}
        </div>
      </div>

      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Invitation"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Invitation
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          <div className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-48 sm:flex-shrink-0">
              Status
            </span>
            <InviteStatusBadge status={invitationStatus} dot />
          </div>
          <div className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-48 sm:flex-shrink-0">
              Sent to
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="min-w-0 break-words text-sm text-[color:var(--text-primary)]">
                {latestInvitation?.sentToEmail ?? employee.companyEmail}
              </span>
              {canEditInviteEmail && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  aria-label="Correct invitation email"
                  onClick={openEmailDialog}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          <ProfileRow label="Sent on" value={formatDate(latestInvitation?.sentAt)} />
          <ProfileRow label="Expires on" value={formatDate(latestInvitation?.expiresAt)} />
        </div>
      </section>

      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Profile"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Profile
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          <ProfileRow
            label="Full name"
            value={[profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(" ")}
          />
          <ProfileRow label="Personal email" value={profile?.personalEmail} />
          <ProfileRow label="Job title" value={profile?.jobTitle ?? employee.jobTitle} />
          <ProfileRow label="Department" value={profile?.department ?? employee.department} />
          <ProfileRow
            label="Birthday"
            value={profile?.birthday ? formatDate(`${profile.birthday}T00:00:00`) : null}
          />
          <ProfileRow
            label="Address"
            value={
              profile?.address
                ? [
                    profile.address.address,
                    profile.address.city,
                    profile.address.province,
                    profile.address.country,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : null
            }
          />
          <ProfileRow
            label="Emergency contact"
            value={
              profile?.emergencyContact
                ? [
                    profile.emergencyContact.emergencyContactName,
                    profile.emergencyContact.emergencyContactNumber,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null
            }
          />
        </div>
      </section>

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
            customFields.map((field) => {
              const answer = field.value?.trim() ?? "";
              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-start sm:gap-4"
                >
                  <span className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-48 sm:flex-shrink-0">
                    {field.fieldLabel}
                  </span>
                  {answer ? (
                    <span className="min-w-0 break-words text-sm text-[color:var(--text-primary)]">
                      {answer}
                    </span>
                  ) : (
                    <span className="text-sm italic text-[color:var(--text-tertiary)]">
                      {field.isRequired ? "Awaiting answer (required)" : "Not answered"}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

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
          {documentConfigs.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No documents requested.
            </p>
          ) : (
            documentConfigs.map((doc) => (
              <DocumentReviewCard
                key={doc.id}
                doc={doc}
                submission={submissionsByDoc.get(doc.id) ?? null}
                onApprove={(sub) => setApproveTarget(sub)}
                onReject={(sub) => {
                  setRejectTarget(sub);
                  setRejectNote("");
                }}
                approvePending={approve.isPending && approveTarget?.id === submissionsByDoc.get(doc.id)?.id}
                rejectPending={reject.isPending}
              />
            ))
          )}
        </div>
      </section>

      <ApproveDocumentDialog
        open={approveTarget !== null}
        employeeName={employeeName}
        documentName={approveTarget?.documentName}
        onCancel={() => setApproveTarget(null)}
        onSubmit={submitApprove}
        pending={approve.isPending}
      />

      <RejectDocumentDialog
        open={rejectTarget !== null}
        employeeName={employeeName}
        documentName={rejectTarget?.documentName}
        rejectNote={rejectNote}
        onRejectNoteChange={setRejectNote}
        onCancel={() => {
          setRejectTarget(null);
          setRejectNote("");
        }}
        onSubmit={submitReject}
        pending={reject.isPending}
      />

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct invitation email</DialogTitle>
            <DialogDescription>
              Update the work email before the employee creates their account. This re-sends the
              invitation.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Work email" htmlFor="invite-email" required error={inviteEmailError}>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@swiftwork.demo"
            />
          </FormField>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInviteEmail} disabled={updateEmail.isPending}>
              <Mail aria-hidden="true" />
              {updateEmail.isPending ? "Sending…" : "Update & resend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OnboardingDetailPage() {
  return (
    <ConfirmProvider>
      <OnboardingDetailInner />
    </ConfirmProvider>
  );
}
