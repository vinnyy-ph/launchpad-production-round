"use client";

import { useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import type { OnboardingDocumentConfig, OnboardingDocStatus } from "../../types/onboarding.types";
import type { DocumentReview } from "../../types/onboarding.types";
import { DocumentViewerModal } from "./document-viewer-modal";

function DocStatusIcon({ status }: { status: OnboardingDocStatus }) {
  if (status === "approved")
    return <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-label="Approved" />;
  if (status === "rejected")
    return <XCircle className="h-4 w-4 text-[#B42318]" aria-label="Rejected" />;
  return <Clock className="h-4 w-4 text-[color:var(--text-quaternary)]" aria-label="Pending review" />;
}

export function DocumentReviewCard({
  doc,
  submission,
  onApprove,
  onReject,
  approvePending,
  rejectPending,
}: {
  doc: OnboardingDocumentConfig;
  submission: DocumentReview | null;
  onApprove: (submission: DocumentReview) => void;
  onReject: (submission: DocumentReview) => void;
  approvePending?: boolean;
  rejectPending?: boolean;
}) {
  const status = submission?.status ?? null;
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <DocStatusIcon status={status ?? "pending"} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-[color:var(--text-primary)]">{doc.documentName}</p>
          {submission ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} shape="pill" />
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="text-xs text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
              >
                View submission
              </button>
            </div>
          ) : (
            <span className="text-xs text-[color:var(--text-tertiary)]">Not submitted</span>
          )}
          {submission?.status === "rejected" && submission.rejectionNote && (
            <p className="mt-1 text-xs text-[#B42318]">{submission.rejectionNote}</p>
          )}
        </div>
      </div>

      {submission && submission.status === "pending" && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#ABEFC6] text-[#067647] hover:bg-[#ECFDF3]"
            onClick={() => onApprove(submission)}
            disabled={approvePending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2]"
            onClick={() => onReject(submission)}
            disabled={rejectPending}
          >
            Reject
          </Button>
        </div>
      )}

      {submission?.status === "approved" && (
        <span className="text-xs font-medium text-[#067647]">Approved</span>
      )}
      {submission?.status === "rejected" && (
        <span className="text-xs font-medium text-[#B42318]">Rejected</span>
      )}

      {submission && (
        <DocumentViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          fileUrl={submission.fileUrl}
          documentName={doc.documentName}
        />
      )}
    </div>
  );
}
