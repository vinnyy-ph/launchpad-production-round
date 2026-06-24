"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
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
 * Previews an evaluation supporting document inline: PDFs render in an iframe,
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
  const [imageFailed, setImageFailed] = useState(false);
  const shouldRenderPdf = Boolean(fileUrl && (isPdf(fileUrl) || imageFailed));

  useEffect(() => {
    setImageFailed(false);
  }, [fileUrl, open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle className="truncate">{documentName ?? "Document"}</DialogTitle>
          <DialogDescription className="sr-only">
            Preview of the supporting document.
          </DialogDescription>
        </DialogHeader>

        {fileUrl ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)]">
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
