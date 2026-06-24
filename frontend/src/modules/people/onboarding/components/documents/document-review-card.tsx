"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import type { OnboardingDocumentConfig } from "../../types/onboarding.types";
import type { DocumentReview } from "../../types/onboarding.types";
import { DocumentViewerModal } from "./document-viewer-modal";

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
  const [viewerOpen, setViewerOpen] = useState(false);

  function handleApprove() {
    if (!submission) return;
    setViewerOpen(false);
    onApprove(submission);
  }

  function handleReject() {
    if (!submission) return;
    setViewerOpen(false);
    onReject(submission);
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[color:var(--text-primary)]">{doc.documentName}</p>
          {submission ? (
            <StatusBadge status={submission.status} shape="pill" />
          ) : (
            <span className="text-xs text-[color:var(--text-tertiary)]">Not submitted</span>
          )}
        </div>

        {submission ? (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setViewerOpen(true)}
          >
            View Submission
          </Button>
        ) : null}
      </div>

      {submission?.status === "rejected" && submission.rejectionNote ? (
        <p className="mt-2 text-xs text-[#B42318]">{submission.rejectionNote}</p>
      ) : null}

      {submission ? (
        <DocumentViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          fileUrl={submission.fileUrl}
          documentName={doc.documentName}
          showReviewActions={submission.status === "pending"}
          onApprove={handleApprove}
          onReject={handleReject}
          approvePending={approvePending}
          rejectPending={rejectPending}
        />
      ) : null}
    </div>
  );
}
