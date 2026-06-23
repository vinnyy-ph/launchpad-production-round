"use client";

import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

function isPdf(fileUrl: string): boolean {
  return /\.pdf(\?|$)/i.test(fileUrl);
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
}: {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  documentName: string | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="truncate">{documentName ?? "Document"}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of the submitted document.
          </DialogDescription>
        </DialogHeader>

        {fileUrl ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)]">
              {isPdf(fileUrl) ? (
                <iframe
                  src={fileUrl}
                  title={documentName ?? "Document preview"}
                  sandbox="allow-same-origin"
                  className="h-[70vh] w-full"
                />
              ) : (
                <div className="flex h-[70vh] items-center justify-center overflow-auto p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrl}
                    alt={documentName ?? "Document preview"}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-end text-xs text-[color:var(--text-secondary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open in new tab
            </a>
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
