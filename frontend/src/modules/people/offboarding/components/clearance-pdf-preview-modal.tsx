"use client";

import { Download, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

/**
 * Previews the generated clearance-form PDF inline (rendered in an iframe) and exposes the
 * Download action from within the preview, so HR can review the document before saving it.
 */
export function ClearancePdfPreviewModal({
  open,
  onClose,
  fileUrl,
  fileName,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
  onDownload: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        hideClose
        className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-4">
          <DialogHeader className="min-w-0 flex-1 space-y-0 text-left">
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <DialogDescription className="sr-only">
              Preview of the clearance form before downloading.
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)]">
          {fileUrl ? (
            <iframe src={fileUrl} title="Clearance form preview" className="h-[70vh] w-full" />
          ) : (
            <p className="py-8 text-center text-sm text-[color:var(--text-tertiary)]">
              Preparing preview…
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onDownload} disabled={!fileUrl}>
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
