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
import { containsUnsafeText } from "@/shared/lib/safe-text";
import { PEOPLE_TEXT_LIMITS } from "@/modules/people/people-text";

const REJECTION_NOTE_MESSAGES = {
  required: "Please explain what needs to be fixed before the employee re-uploads this document.",
  length: `Please keep the rejection reason to ${PEOPLE_TEXT_LIMITS.NOTE} characters or fewer.`,
  content:
    "Please enter a valid rejection reason using letters, numbers, spaces, and common punctuation only.",
} as const;
const REJECTION_NOTE_RE = /^[A-Za-z0-9\s.,'&/()#:\-]+$/;

function rejectionNoteError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return REJECTION_NOTE_MESSAGES.required;
  if (trimmed.length > PEOPLE_TEXT_LIMITS.NOTE) return REJECTION_NOTE_MESSAGES.length;
  if (containsUnsafeText(trimmed)) return REJECTION_NOTE_MESSAGES.content;
  if (!REJECTION_NOTE_RE.test(trimmed)) return REJECTION_NOTE_MESSAGES.content;
  return undefined;
}

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
  const noteError = rejectionNoteError(rejectNote);

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
          <FormField label="Reason" htmlFor="reject-note" required error={noteError}>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => onRejectNoteChange(e.target.value)}
              placeholder="e.g. The ID photo is blurry — please re-upload a clear scan."
              rows={3}
              maxLength={PEOPLE_TEXT_LIMITS.NOTE}
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending || Boolean(noteError)}>
            {pending ? "Rejecting…" : "Reject document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
