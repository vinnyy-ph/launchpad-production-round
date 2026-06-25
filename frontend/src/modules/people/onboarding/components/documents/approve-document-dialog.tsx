"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

export function ApproveDocumentDialog({
  open,
  employeeName,
  documentName,
  onCancel,
  onSubmit,
  pending,
}: {
  open: boolean;
  employeeName: string;
  documentName: string | undefined;
  onCancel: () => void;
  onSubmit: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve document</DialogTitle>
          <DialogDescription>
            Approve &ldquo;{documentName}&rdquo; for {employeeName}? This moves the document out of
            the review queue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending} loading={pending}>
            {pending ? "Approving…" : "Approve document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
