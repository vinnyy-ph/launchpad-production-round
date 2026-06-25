"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, FileText, PenLine, XCircle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Separator,
  Skeleton,
  Textarea,
  UserAvatar,
} from "@/shared/ui";
import { PEOPLE_TEXT_LIMITS, validatePeopleText } from "@/modules/people/people-text";
import { DocumentViewerModal } from "@/modules/people/onboarding/components/documents/document-viewer-modal";
import { useOffboarding } from "../hooks/use-offboarding";
import type { AssignedClearance, OffboardingAttachment } from "../types/offboarding.types";
import { SignatureCapture } from "./signature-capture";

/** Steps inside the review modal: read the case, then sign or reject it. */
type ReviewMode = "review" | "sign" | "reject";

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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

interface ClearanceReviewModalProps {
  /** The clearance being reviewed; `null` keeps the modal closed. */
  clearance: AssignedClearance | null;
  onClose: () => void;
  /** Signs the request with the captured signature image and an optional note. */
  onSign: (signatureImage: string, note?: string) => Promise<void>;
  /** Rejects the request with a required note. */
  onReject: (note: string) => Promise<void>;
  signing: boolean;
  rejecting: boolean;
}

/**
 * Review modal for a clearance awaiting the caller's signature. Shows the offboardee's
 * details and the case's uploaded documents (fetched on open), then lets the signatory
 * sign — capturing a required signature and an optional note — or reject with a required
 * note. The signature is captured as a white-background PNG image and sent to the backend.
 */
export function ClearanceReviewModal({
  clearance,
  onClose,
  onSign,
  onReject,
  signing,
  rejecting,
}: ClearanceReviewModalProps) {
  const [mode, setMode] = useState<ReviewMode>("review");
  const [signature, setSignature] = useState<string | null>(null);
  const [signNote, setSignNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<OffboardingAttachment | null>(null);

  // Pull the full case for its attachments (signed view URLs). Authorized for signatories.
  const { offboarding, loading } = useOffboarding(clearance?.offboardingId ?? null);

  // Reset to the review step whenever a different clearance opens.
  useEffect(() => {
    if (clearance) {
      setMode("review");
      setSignature(null);
      setSignNote("");
      setRejectNote("");
    }
  }, [clearance?.requestId]);

  const signNoteError = signNote.trim()
    ? validatePeopleText(signNote.trim(), "Note", PEOPLE_TEXT_LIMITS.NOTE)
    : undefined;
  const rejectNoteError = rejectNote.trim()
    ? validatePeopleText(rejectNote.trim(), "Rejection reason", PEOPLE_TEXT_LIMITS.NOTE)
    : undefined;

  async function handleSign() {
    if (!clearance || !signature) return;
    const note = signNote.trim();
    if (note && validatePeopleText(note, "Note", PEOPLE_TEXT_LIMITS.NOTE)) return;
    await onSign(signature, note || undefined);
  }

  async function handleReject() {
    if (!clearance || !rejectNote.trim() || rejectNoteError) return;
    await onReject(rejectNote.trim());
  }

  const offboardee = clearance?.offboardee;
  const name = offboardee ? fullName(offboardee) : "";
  const attachments = offboarding?.attachments ?? [];
  const busy = signing || rejecting;

  const title =
    mode === "sign" ? "Sign this clearance" : mode === "reject" ? "Reject clearance" : "Review clearance";

  return (
    <>
      {/*
        Guard against the nested document-preview dialog closing this one: dismissing the
        inner DocumentViewerModal (Escape / outside-click) also fires this onOpenChange, so
        ignore close requests while a preview is open or an action is in flight.
      */}
      <Dialog
        open={!!clearance}
        onOpenChange={(open) => {
          if (!open && !busy && previewAttachment === null) onClose();
        }}
      >
        <DialogContent
          overlayClassName="backdrop-blur-none"
          className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto sm:max-w-4xl"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {clearance && offboardee ? (
            <>
              {/* Offboardee identity — shown in every step for context. */}
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={offboardee.avatarUrl}
                  fallback={initials(name)}
                  className="h-16 w-16"
                  fallbackClassName="text-lg font-bold text-[color:var(--text-primary)]"
                  fallbackStyle={{
                    background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold text-[color:var(--text-primary)]">
                    {name}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                    {offboardee.jobTitle ?? "—"}
                    {offboardee.department ? ` · ${offboardee.department}` : ""}
                  </p>
                </div>
              </div>

              {mode === "review" && (
                <div className="space-y-4">
                  {/* Case details */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-4">
                    <Detail label="Clearance">{clearance.purpose}</Detail>
                    <Detail label="Effective date">{formatDate(clearance.effectiveDate)}</Detail>
                    <div className="col-span-2">
                      <Detail label="Requirements">
                        {clearance.requirements ?? "Department clearance"}
                      </Detail>
                    </div>
                  </div>

                  {/* Uploaded documents */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                      Uploaded documents
                    </p>
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </div>
                    ) : attachments.length === 0 ? (
                      <p className="rounded-lg border border-[color:var(--border-primary)] px-4 py-3 text-sm text-[color:var(--text-tertiary)]">
                        No documents uploaded for this case.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[color:var(--border-primary)] rounded-lg border border-[color:var(--border-primary)]">
                        {attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <FileText
                                className="h-5 w-5 flex-shrink-0 text-[color:var(--text-tertiary)]"
                                strokeWidth={1.7}
                                aria-hidden="true"
                              />
                              <span
                                className="truncate text-sm font-medium text-[color:var(--text-primary)]"
                                title={attachment.fileName}
                              >
                                {attachment.fileName}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => setPreviewAttachment(attachment)}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {mode === "sign" && (
                <div className="space-y-3">
                  <SignatureCapture onChange={setSignature} />
                  <p className="text-xs text-[color:var(--text-secondary)]">
                    I understand this is a legal representation of my signature.
                  </p>
                  <Textarea
                    placeholder="Add a note (optional)"
                    value={signNote}
                    onChange={(e) => setSignNote(e.target.value)}
                    rows={2}
                    maxLength={PEOPLE_TEXT_LIMITS.NOTE}
                  />
                  {signNoteError ? (
                    <p className="text-xs text-[color:var(--color-error-500)]">{signNoteError}</p>
                  ) : null}
                </div>
              )}

              {mode === "reject" && (
                <div className="space-y-2">
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    Provide a reason for rejecting the <strong>{clearance.purpose}</strong>{" "}
                    clearance for <strong>{name}</strong>.
                  </p>
                  <Textarea
                    placeholder="Rejection reason (required)"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    rows={3}
                    maxLength={PEOPLE_TEXT_LIMITS.NOTE}
                  />
                  {rejectNoteError ? (
                    <p className="text-xs text-[color:var(--color-error-500)]">{rejectNoteError}</p>
                  ) : null}
                </div>
              )}

              <Separator />

              <DialogFooter>
                {mode === "review" ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setMode("reject")}
                    >
                      <XCircle size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button onClick={() => setMode("sign")}>
                      <PenLine size={14} className="mr-1" />
                      Sign
                    </Button>
                  </>
                ) : mode === "sign" ? (
                  <>
                    <Button variant="secondary" onClick={() => setMode("review")} disabled={signing}>
                      <ArrowLeft size={14} className="mr-1" />
                      Back
                    </Button>
                    <Button
                      onClick={() => void handleSign()}
                      disabled={!signature || signing || Boolean(signNoteError)}
                      loading={signing}
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      {signing ? "Signing…" : "Confirm & sign"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => setMode("review")} disabled={rejecting}>
                      <ArrowLeft size={14} className="mr-1" />
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void handleReject()}
                      disabled={rejectNote.trim() === "" || rejecting || Boolean(rejectNoteError)}
                      loading={rejecting}
                    >
                      {rejecting ? "Rejecting…" : "Confirm reject"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <DocumentViewerModal
        open={previewAttachment !== null}
        onClose={() => setPreviewAttachment(null)}
        fileUrl={previewAttachment?.url ?? null}
        documentName={previewAttachment?.fileName}
      />
    </>
  );
}

/** A small labelled value used in the case-details grid. */
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{children}</p>
    </div>
  );
}
