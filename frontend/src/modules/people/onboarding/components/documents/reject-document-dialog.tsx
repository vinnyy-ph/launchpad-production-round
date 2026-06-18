"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Textarea,
} from "@/shared/ui";

export function RejectDocumentDialog({
  open,
  employeeName,
  documentName,
  rejectNote,
  onRejectNoteChange,
  onCancel,
  onSubmit,
  pending,
}: {
  open: boolean;
  employeeName: string;
  documentName: string | undefined;
  rejectNote: string;
  onRejectNoteChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject document</DialogTitle>
          <DialogDescription>
            Tell {employeeName} why &ldquo;{documentName}&rdquo; needs to be re-uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <FormField label="Reason" htmlFor="reject-note" required>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => onRejectNoteChange(e.target.value)}
              placeholder="e.g. The ID photo is blurry — please re-upload a clear scan."
              rows={3}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Rejecting…" : "Reject document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
