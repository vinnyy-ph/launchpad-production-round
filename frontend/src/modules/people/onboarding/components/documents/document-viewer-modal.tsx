"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

function isPdf(fileUrl: string): boolean {
  try {
    return decodeURIComponent(new URL(fileUrl).pathname).toLowerCase().includes(".pdf");
  } catch {
    return decodeURIComponent(fileUrl.split("?")[0]).toLowerCase().includes(".pdf");
  }
}

/**
 * Previews an onboarding document submission inline: PDFs render in an iframe,
 * images as an <img>. Replaces opening the file in a new browser tab.
 */
export function DocumentViewerModal({
  open,
  onClose,
  fileUrl,
  documentName,
  showReviewActions = false,
  onApprove,
  onReject,
  approvePending,
  rejectPending,
}: {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  documentName: string | undefined;
  showReviewActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  approvePending?: boolean;
  rejectPending?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const shouldRenderPdf = Boolean(fileUrl && (isPdf(fileUrl) || imageFailed));

  useEffect(() => {
    setImageFailed(false);
  }, [fileUrl, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent hideClose className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <DialogHeader className="min-w-0 flex-1 space-y-0 text-left">
            <DialogTitle className="truncate">{documentName ?? "Document"}</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the submitted document.
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 transition-opacity hover:opacity-100">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {fileUrl ? (
          <>
            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)]">
              {shouldRenderPdf ? (
                <iframe
                  src={fileUrl}
                  title={documentName ?? "Document preview"}
                  className="h-[70vh] w-full"
                />
              ) : (
                <div className="flex h-[70vh] items-center justify-center overflow-auto p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={documentName ?? "Document preview"}
                    className="max-h-full max-w-full object-contain"
                    onError={() => setImageFailed(true)}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Open in new tab
              </a>

              {showReviewActions ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-[#FECDCA] text-[#B42318] hover:bg-[#FEF3F2]"
                    onClick={onReject}
                    disabled={rejectPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={onApprove} disabled={approvePending}>
                    <CheckCircle2 aria-hidden="true" />
                    {approvePending ? "Approving…" : "Approve"}
                  </Button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-[color:var(--text-tertiary)]">
            No document to preview.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
