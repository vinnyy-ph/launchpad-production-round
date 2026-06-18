"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Separator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Textarea,
} from "@/shared/ui";
import { EmptyState, ErrorState, StatusBadge, ConfirmProvider, useConfirm } from "@/shared/ui/patterns";
import { useOnboardingRecord } from "@/modules/people/onboarding/hooks/use-onboarding-record";
import { useApproveDocument, useRejectDocument } from "@/modules/people/onboarding/hooks/use-review-document";
import { useCompleteOnboarding } from "@/modules/people/onboarding/hooks/use-complete-onboarding";
import { useSendInvite } from "@/modules/people/onboarding/hooks/use-send-invite";
import type { DocumentReview, OnboardingDocStatus } from "@/modules/people/onboarding/types/onboarding.types";

// ─── helpers ────────────────────────────────────────────────────────────────

function DocStatusIcon({ status }: { status: OnboardingDocStatus }) {
  if (status === "approved")
    return <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-label="Approved" />;
  if (status === "rejected")
    return <XCircle className="h-4 w-4 text-[#B42318]" aria-label="Rejected" />;
  return <Clock className="h-4 w-4 text-[color:var(--text-quaternary)]" aria-label="Pending review" />;
}

// ─── page ───────────────────────────────────────────────────────────────────

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

  // Reject-with-note dialog state.
  const [rejectTarget, setRejectTarget] = useState<DocumentReview | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // This employee's submissions, keyed by document config id (latest wins).
  const submissionsByDoc = useMemo(() => {
    const mine = reviews
      .filter((r) => r.employee.id === employeeId)
      .sort((a, b) => +new Date(a.submittedAt) - +new Date(b.submittedAt));
    const map = new Map<string, DocumentReview>();
    for (const r of mine) map.set(r.documentId, r);
    return map;
  }, [reviews, employeeId]);

  const recordId = useMemo(
    () => reviews.find((r) => r.employee.id === employeeId)?.recordId ?? null,
    [reviews, employeeId],
  );

  // The new hire's custom fields with their actual answers. Prefer the HR-scoped
  // status (carries answers); fall back to org-wide config labels while it loads.
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

  async function handleApprove(sub: DocumentReview) {
    const ok = await confirm({
      title: `Approve "${sub.documentName}"?`,
      description: "Approving all required documents lets you mark onboarding complete.",
      confirmLabel: "Approve",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    approve.mutate(sub.id, {
      onSuccess: () => toast.success(`"${sub.documentName}" approved.`),
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
      description: "This activates the employee's account once all requirements are met.",
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

  // ─── render guards ──────────────────────────────────────────────────────

  if (loading) return null;

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
          action={{ label: "Back to Onboarding", onClick: () => router.push("/hr/onboarding") }}
        />
      </div>
    );
  }

  const employeeName = employee.fullName;
  const isComplete = employee.status === "active";

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
          <PageHeader level="page" title={employeeName} subtitle={employee.companyEmail} />
          <div className="flex items-center gap-3 -mt-4">
            <StatusBadge status={employee.status} dot />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {!isComplete && recordId && (
            <Button variant="outline" onClick={handleSendInvite} disabled={invite.isPending}>
              {invite.isPending ? "Sending…" : "Resend invite"}
            </Button>
          )}
          {!isComplete && (
            <Button onClick={handleComplete} disabled={complete.isPending}>
              {complete.isPending ? "Completing…" : "Mark complete"}
            </Button>
          )}
        </div>
      </div>

      {/* Custom Fields — the new hire's ACTUAL answers (from the HR-scoped status). */}
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
          {documentConfigs.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No documents requested.
            </p>
          ) : (
            documentConfigs.map((doc) => {
              const sub = submissionsByDoc.get(doc.id) ?? null;
              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <DocStatusIcon status={sub?.status ?? "pending"} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">
                        {doc.documentName}
                      </p>
                      {sub ? (
                        <StatusBadge status={sub.status} shape="pill" />
                      ) : (
                        <span className="text-xs text-[color:var(--text-tertiary)]">
                          Not submitted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* HR approve / reject — only for submitted (pending) docs */}
                  {sub && sub.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#067647] border-[#ABEFC6] hover:bg-[#ECFDF3]"
                        onClick={() => void handleApprove(sub)}
                        disabled={approve.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#B42318] border-[#FECDCA] hover:bg-[#FEF3F2]"
                        onClick={() => {
                          setRejectTarget(sub);
                          setRejectNote("");
                        }}
                        disabled={reject.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {sub?.status === "approved" && (
                    <span className="text-xs font-medium text-[#067647]">Approved</span>
                  )}
                  {sub?.status === "rejected" && (
                    <span className="text-xs font-medium text-[#B42318]">Rejected</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Reject-with-note dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setRejectTarget(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
            <DialogDescription>
              Tell {employeeName} why &ldquo;{rejectTarget?.documentName}&rdquo; needs to be re-uploaded.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <FormField label="Reason" htmlFor="reject-note" required>
              <Textarea
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. The ID photo is blurry — please re-upload a clear scan."
                rows={3}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectTarget(null);
                setRejectNote("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitReject} disabled={reject.isPending}>
              {reject.isPending ? "Rejecting…" : "Reject document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── page export (wraps with ConfirmProvider) ─────────────────────────────────

export default function OnboardingDetailPage() {
  return (
    <ConfirmProvider>
      <OnboardingDetailInner />
    </ConfirmProvider>
  );
}
