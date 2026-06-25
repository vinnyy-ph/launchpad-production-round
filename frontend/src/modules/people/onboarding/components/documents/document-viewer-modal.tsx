"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, ImageOff, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@/shared/ui";

/**
 * Previews an onboarding document submission inline. The file is fetched first so a failed
 * load (missing/expired source) shows an error state instead of rendering the server's JSON
 * error response; PDFs render in an iframe, images as an <img>, both from a blob URL.
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
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    if (!open || !fileUrl) {
      return;
    }

    setStatus("loading");
    setPreviewUrl(null);
    const controller = new AbortController();
    let objectUrl: string | null = null;

    fetch(fileUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load document");
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setIsPdf(blob.type === "application/pdf");
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("error");
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
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
              {status === "loading" ? (
                <div className="flex h-[70vh] items-center justify-center">
                  <Spinner size={24} />
                </div>
              ) : status === "error" ? (
                <div className="flex h-[70vh] flex-col items-center justify-center gap-2 px-6 text-center">
                  <ImageOff
                    className="h-8 w-8 text-[color:var(--text-tertiary)]"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-[color:var(--text-secondary)]">
                    Unable to load this document
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    The file may have been moved or is no longer available.
                  </p>
                </div>
              ) : isPdf ? (
                <iframe
                  src={previewUrl ?? undefined}
                  title={documentName ?? "Document preview"}
                  className="h-[70vh] w-full"
                />
              ) : (
                <div className="flex h-[70vh] items-center justify-center overflow-auto p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl ?? undefined}
                    alt={documentName ?? "Document preview"}
                    className="max-h-full max-w-full object-contain"
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
                    className="border-[color:var(--color-error-200)] text-[color:var(--color-error-700)] hover:bg-[color:var(--color-error-50)]"
                    onClick={onReject}
                    disabled={rejectPending}
                    loading={rejectPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={onApprove} disabled={approvePending} loading={approvePending}>
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
