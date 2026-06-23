"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Trash2,
  Send,
  Eye,
  ChevronLeft,
  ArrowUpDown,
  FileText,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/shared/components/layout/screen-header";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  DateRangePicker,
  type DateRange,
} from "@/shared/ui";
import {
  EmptyState,
  DataTable,
  FormField,
  StatusBadge,
  FilterBar,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import {
  useEvaluations,
  useMyDirectReports,
  useCreateEvaluation,
  useUpdateEvaluation,
  useDeleteEvaluation,
  useSendEvaluation,
  downloadSupportingDoc,
  GRADE_LABELS,
  type Evaluation,
  type EvaluationInput,
  type Reviewee,
} from "@/modules/performance/evaluations";
import { useAutosave } from "@/modules/performance/shared/use-autosave";
import { DraftSaveStatus } from "@/modules/performance/shared/draft-save-status";
import {
  evaluationTextSchema,
  EVAL_TEXT_LIMITS,
} from "@/modules/performance/evaluations/schemas/evaluation-form.schema";
import { formatPeriod } from "./evaluations.format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A single date, relative when near today (Yesterday/Today/Tomorrow/Next <weekday>),
 *  otherwise an absolute date with the year dropped when it falls in the current year. */
function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 6) return `Next ${format(target, "EEEE")}`;
  const sameYear = target.getFullYear() === today.getFullYear();
  return format(target, sameYear ? "LLL d" : "LLL d, yyyy");
}

function extractFilename(value: string): string {
  const last = value.split("/").pop() ?? value;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

async function handleDownload(evaluationId: string, docIndex: number): Promise<void> {
  try {
    await downloadSupportingDoc(evaluationId, docIndex);
  } catch {
    toast.error("Couldn't download the document. Please try again.");
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** First + last initial of a name, for the reviewee avatar (mirrors the directory table). */
function revieweeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const letters = (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
  return letters.toUpperCase() || "—";
}

type AckTone = "warning" | "success" | "info";

/** Acknowledgement status for the table: Pending / Acknowledged / Auto-acknowledged (no overdue). */
function ackInfo(ev: Evaluation): { status: string; tone: AckTone } | null {
  if (!ev.isSent) return null;
  const ack = ev.acknowledgement;
  if (ack?.acknowledgedAt && !ack.isDeemedAck) return { status: "Acknowledged", tone: "success" };
  if (ack?.isDeemedAck) return { status: "Auto-acknowledged", tone: "info" };
  return { status: "Pending", tone: "warning" };
}

// Overall-rating options — number, label, and a one-line bar for each level.
const RATING_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 1, label: "Unsatisfactory", desc: "Consistently below the bar; immediate improvement needed." },
  { value: 2, label: "Below expectations", desc: "Falls short in key areas." },
  { value: 3, label: "Meets expectations", desc: "Solid, reliable performance against the role's bar." },
  { value: 4, label: "Exceeds expectations", desc: "Regularly goes beyond what the role requires." },
  { value: 5, label: "Exceptional", desc: "Standout impact, well above the role." },
];

// ─── Itemized text list (highlights / areas for improvement) ────────────────────

interface DynamicListProps {
  label: string;
  htmlFor: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  hintAbove?: boolean;
  addLabel?: string;
  readOnly?: boolean;
  maxLength?: number;
  error?: string;
}

function DynamicList({ label, htmlFor, items, onChange, placeholder, hint, optional, hintAbove, addLabel = "Add", readOnly, maxLength, error }: DynamicListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  const update = (idx: number, val: string) => onChange(items.map((v, i) => (i === idx ? val : v)));
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    // Move focus to the previous row's input, falling back to the Add button.
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input");
      const target = inputs?.[Math.max(0, idx - 1)];
      (target ?? addRef.current)?.focus();
    });
  };
  const add = () => {
    const next = items.length;
    onChange([...items, ""]);
    requestAnimationFrame(() => {
      const inputs = listRef.current?.querySelectorAll<HTMLInputElement>("input");
      inputs?.[next]?.focus();
    });
  };

  if (readOnly) {
    return (
      <FormField label={label} htmlFor={htmlFor}>
        {items.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {items.map((val, idx) => (
              <li key={idx} className="text-sm text-[color:var(--text-secondary)]">
                {val}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--text-tertiary)]">—</p>
        )}
      </FormField>
    );
  }

  return (
    <FormField label={label} htmlFor={htmlFor} hint={hint} optional={optional} hintAbove={hintAbove} error={error}>
      <div ref={listRef} className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              id={idx === 0 ? htmlFor : undefined}
              value={val}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
              maxLength={maxLength}
              aria-label={`${label} ${idx + 1}`}
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Remove ${label.toLowerCase()} ${idx + 1}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button ref={addRef} variant="secondary" size="sm" type="button" onClick={add}>
          <Plus size={12} /> {addLabel}
        </Button>
      </div>
    </FormField>
  );
}

// ─── PDF file picker ──────────────────────────────────────────────────────────

interface PdfFilePickerProps {
  files: File[];
  existingUrls: string[];
  onChange: (files: File[]) => void;
  error?: string;
}

function PdfFilePicker({ files, existingUrls, onChange, error }: PdfFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    // Reset so the same file can be re-selected after removal.
    e.target.value = "";

    const validFiles: File[] = [];
    for (const file of selected) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error(`"${file.name}" is not a PDF.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the 10 MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    const combined = [...files, ...validFiles];
    const totalExisting = existingUrls.length;
    const newCount = files.length + validFiles.length;
    if (totalExisting + newCount > 5 || combined.length > 5) {
      toast.error("You can attach up to 5 files total.");
      // Take only as many as fit.
      const slotsLeft = Math.max(0, 5 - files.length - existingUrls.length);
      onChange([...files, ...validFiles.slice(0, slotsLeft)]);
      return;
    }
    onChange(combined);
  };

  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx));

  const showExisting = existingUrls.length > 0 && files.length === 0;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf"
        className="sr-only"
        onChange={handleSelect}
        aria-label="Upload PDF files"
      />

      {showExisting && (
        <div className="space-y-1.5 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
          {existingUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[color:hsl(var(--primary))] underline"
            >
              <FileText size={14} className="flex-none" />
              {extractFilename(url)}
            </a>
          ))}
          <p className="text-xs text-[color:var(--text-tertiary)]">Upload new files to replace these.</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-3">
          {files.map((file, idx) => (
            <div key={file.name} className="flex items-center gap-2">
              <FileText size={14} className="flex-none text-[color:var(--text-tertiary)]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[color:var(--text-primary)]">
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-[color:var(--text-tertiary)]">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded p-0.5 text-[color:var(--text-quaternary)] transition-colors hover:bg-[color:var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove ${file.name}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Plus size={12} /> Add PDFs
      </Button>

      {error && <p className="text-xs text-[color:var(--color-error-600)]">{error}</p>}
    </div>
  );
}

// ─── Evaluation editor dialog ─────────────────────────────────────────────────

interface SendPayload {
  existing: Evaluation | null;
  input: EvaluationInput;
  name: string;
  files: File[];
}

interface EditorProps {
  open: boolean;
  onClose: () => void;
  initial: Evaluation | null;
  reviewees: Reviewee[];
  onSubmit: (input: EvaluationInput, files: File[]) => void;
  onRequestSend: (payload: SendPayload) => void;
  /** Request deletion of the current draft (opens the parent's confirm). Drafts only. */
  onRequestDelete?: () => void;
  /** Silent autosave persist. Creates when no id, updates otherwise; returns the draft id. */
  onAutosave?: (input: EvaluationInput, draftId: string | null) => Promise<string>;
}

/** Serializable field snapshot for autosave change-detection + localStorage buffer. */
interface EvalSnapshot {
  revieweeId: string;
  periodStart: string | null;
  periodEnd: string | null;
  grade: number | null;
  highlights: string[];
  lowlights: string[];
  evaluation: string;
  recommendation: string;
}

function EvaluationEditorDialog({
  open,
  onClose,
  initial,
  reviewees,
  onSubmit,
  onRequestSend,
  onRequestDelete,
  onAutosave,
}: EditorProps) {
  const [revieweeId, setRevieweeId] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [grade, setGrade] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [lowlights, setLowlights] = useState<string[]>([]);
  const [evaluationText, setEvaluationText] = useState("");
  const [recommendationText, setRecommendationText] = useState("");
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [existingDocUrls, setExistingDocUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Two-step flow: fill the form → review the preview → save or send.
  const [step, setStep] = useState<"form" | "preview">("form");

  const isViewOnly = initial?.isSent ?? false;
  const isDraft = !!initial && !initial.isSent;
  const showPreview = isViewOnly || step === "preview";

  /** Drop a single field's error as the user corrects it (live feedback). */
  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  // ── Autosave (drafts only; a sent evaluation is read-only) ──
  // Files are deliberately excluded — uploads happen only on explicit Save/Send, so autosave
  // never re-uploads or wipes attached documents.
  const draftId = initial?.id ?? null;
  const snapshot = useMemo<EvalSnapshot>(
    () => ({
      revieweeId,
      periodStart: period?.from ? period.from.toISOString() : null,
      periodEnd: period?.to ? period.to.toISOString() : null,
      grade,
      highlights,
      lowlights,
      evaluation: evaluationText,
      recommendation: recommendationText,
    }),
    [revieweeId, period, grade, highlights, lowlights, evaluationText, recommendationText],
  );
  const canPersist = !!revieweeId && !!period?.from && !!period?.to && !!grade;
  const saveRef = useRef<(id: string | null) => Promise<string>>(async (id) => id ?? "");
  const autosave = useAutosave({
    open,
    enabled: !isViewOnly && !!onAutosave,
    draftId,
    snapshot,
    canPersist,
    storageKey: `autosave:eval:${draftId ?? "new"}`,
    onSave: (id) => saveRef.current(id),
  });

  // Hydrate once per open. Guarded so autosave creating the draft — which flips `initial`
  // from null to the saved evaluation — does not re-hydrate over the in-progress edits.
  const hydratedRef = useRef(false);
  // Guards the save-on-close (files path) against re-entry while its upload is in flight, so a
  // double Cancel/Esc/backdrop can't create two drafts. Reset on each open.
  const closeSavingRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    closeSavingRef.current = false;
    setStep("form");
    let baseline: EvalSnapshot;
    if (initial) {
      const start = new Date(initial.periodStart);
      const end = new Date(initial.periodEnd);
      setRevieweeId(initial.revieweeId);
      setPeriod({ from: start, to: end });
      setGrade(initial.grade ?? null);
      setHighlights(initial.highlights ?? []);
      setLowlights(initial.lowlights ?? []);
      setEvaluationText(initial.evaluation ?? "");
      setRecommendationText(initial.recommendation ?? "");
      setExistingDocUrls(initial.supportingDocUrls ?? []);
      setLocalFiles([]);
      baseline = {
        revieweeId: initial.revieweeId,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        grade: initial.grade ?? null,
        highlights: initial.highlights ?? [],
        lowlights: initial.lowlights ?? [],
        evaluation: initial.evaluation ?? "",
        recommendation: initial.recommendation ?? "",
      };
    } else {
      // Reviewee starts empty (placeholder "Select employee").
      setRevieweeId("");
      // Smart default: prefill the current month as the evaluation period.
      const now = new Date();
      const from = startOfMonth(now);
      const to = endOfMonth(now);
      setPeriod({ from, to });
      setGrade(null);
      setHighlights([]);
      setLowlights([]);
      setEvaluationText("");
      setRecommendationText("");
      setExistingDocUrls([]);
      setLocalFiles([]);
      baseline = {
        revieweeId: "",
        periodStart: from.toISOString(),
        periodEnd: to.toISOString(),
        grade: null,
        highlights: [],
        lowlights: [],
        evaluation: "",
        recommendation: "",
      };
    }
    setErrors({});
    autosave.setBaseline(baseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  /** Apply a recovered localStorage buffer to the form, then dismiss the prompt. */
  const restoreFromBuffer = (b: EvalSnapshot) => {
    setRevieweeId(b.revieweeId);
    setPeriod(
      b.periodStart && b.periodEnd
        ? { from: new Date(b.periodStart), to: new Date(b.periodEnd) }
        : undefined,
    );
    setGrade(b.grade);
    setHighlights(b.highlights);
    setLowlights(b.lowlights);
    setEvaluationText(b.evaluation);
    setRecommendationText(b.recommendation);
    autosave.acceptRecovery();
  };

  /** Required to create/save a draft: reviewee, period, and rating. */
  /** Length / no-HTML safety on the free-text fields (mirrors backend rules). */
  const textErrors = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const text = evaluationTextSchema.safeParse({
      evaluation: evaluationText,
      recommendation: recommendationText,
      highlights,
      lowlights,
    });
    if (!text.success) {
      // The evaluation summary surfaces under the `summary` key in this form.
      const keyFor: Record<string, string> = { evaluation: "summary" };
      for (const issue of text.error.issues) {
        const field = String(issue.path[0] ?? "");
        const key = keyFor[field] ?? field;
        if (!errs[key]) errs[key] = issue.message;
      }
    }
    return errs;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = { ...textErrors() };
    if (!revieweeId) errs.reviewee = "Select an employee.";
    if (!period?.from || !period?.to) errs.period = "Select an evaluation period.";
    if (!grade) errs.grade = "Pick an overall rating.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Build the wire payload from the current form state (assumes it has been validated). */
  const buildInput = (): EvaluationInput | null => {
    if (!period?.from || !period?.to) return null;
    return {
      revieweeId,
      periodStart: period.from.toISOString(),
      periodEnd: period.to.toISOString(),
      grade: grade as number,
      highlights: highlights.map((h) => h.trim()).filter(Boolean),
      lowlights: lowlights.map((l) => l.trim()).filter(Boolean),
      evaluation: evaluationText.trim() || undefined,
      recommendation: recommendationText.trim() || undefined,
    };
  };

  // Keep the autosave save closure pointed at the current buildInput / onAutosave.
  saveRef.current = async (id) => {
    if (!onAutosave) return id ?? "";
    const input = buildInput();
    if (!input) return id ?? "";
    return onAutosave(input, id);
  };

  const handleSubmit = () => {
    if (isViewOnly) return;
    const input = validate() ? buildInput() : null;
    if (!input) {
      setStep("form");
      return;
    }
    // Manual save takes over: cancel any pending autosave and drop the local buffer.
    autosave.cancel();
    autosave.clearBuffer();
    onSubmit(input, localFiles);
  };

  /** Sending is irreversible — require reviewee, period, rating, and an overall summary, pointing at
   *  the exact missing field. Works for a brand-new evaluation too (the page creates then sends). */
  const handleSend = () => {
    if (isViewOnly) return;
    const errs: Record<string, string> = { ...textErrors() };
    if (!revieweeId) errs.reviewee = "Select an employee before sending.";
    if (!period?.from || !period?.to) errs.period = "Add the evaluation period before sending.";
    if (!grade) errs.grade = "Pick an overall rating before sending.";
    if (!evaluationText.trim()) errs.summary = "Add an overall summary before sending.";
    const input = buildInput();
    if (Object.keys(errs).length > 0 || !input) {
      setErrors((e) => ({ ...e, ...errs }));
      setStep("form");
      toast.error("Fill in the required fields before sending.");
      return;
    }
    autosave.cancel();
    autosave.clearBuffer();
    onRequestSend({ existing: initial, input, name: previewName, files: localFiles });
  };

  /** Leave the editor, keeping the work. Autosave persists the text fields but never uploads
   *  files — so when attachments are pending on a persistable draft, do a real save (which
   *  uploads them) and let the page close on success; otherwise just flush the text autosave. */
  const handleClose = () => {
    if (isViewOnly) {
      onClose();
      return;
    }
    autosave.cancel();
    const input = buildInput();
    if (localFiles.length > 0 && canPersist && input) {
      if (closeSavingRef.current) return; // an upload-on-close is already running
      closeSavingRef.current = true;
      autosave.clearBuffer();
      onSubmit(input, localFiles); // the page closes the editor on success
      return;
    }
    autosave.flush();
    onClose();
  };

  const revieweeName = (id: string) => reviewees.find((r) => r.id === id)?.fullName ?? id;

  const previewName = initial?.reviewee?.fullName ?? (revieweeId ? revieweeName(revieweeId) : "the employee");
  const previewPeriod =
    period?.from && period?.to
      ? formatPeriod(period.from.toISOString(), period.to.toISOString())
      : "Evaluation period";

  const title = isViewOnly ? "Evaluation" : isDraft ? "Edit evaluation" : "New evaluation";
  const description = isViewOnly
    ? "This evaluation has been sent and is now read-only."
    : step === "preview"
      ? `Here's exactly what ${previewName} will see. Save it as a draft or send it.`
      : "Evaluate one of your direct reports for a set period. It saves as a draft you can edit until you send.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="dialog-pop flex max-h-[90vh] flex-col gap-0 sm:max-w-2xl"
        // Block Radix's own outside-dismiss so portaled Selects / date pickers / dropdowns
        // (incl. clicking a trigger again to close it) can never close the modal. A real
        // backdrop click closes it explicitly via onOverlayClick, keeping the draft.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOverlayClick={handleClose}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!isViewOnly && autosave.recoverable != null && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3.5 py-2.5 text-[13px] text-[color:var(--text-secondary)]">
            <span>You have unsaved changes from a previous session.</span>
            <span className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => restoreFromBuffer(autosave.recoverable as EvalSnapshot)}
                className="font-semibold text-[color:var(--text-primary)] underline underline-offset-2"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={autosave.discardRecovery}
                className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
              >
                Discard
              </button>
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Form step → advance to the preview. (The preview step has no submit button; the
            // draft autosaves and persists on close.)
            if (!isViewOnly && step === "form") setStep("preview");
            else handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Scroll region — full-bleed so the thin scrollbar sits at the modal edge,
              while content stays padded in line with the header. */}
          <div className="-mx-6 mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5 scrollbar-thin">
            {showPreview ? (
              // ── Employee-facing preview ──────────────────────────────────────
              <div
                className="space-y-5 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    For {previewName}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                    {previewPeriod} · Performance evaluation
                  </p>
                </div>

                {grade && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Overall rating
                    </p>
                    <p className="text-sm text-[color:var(--text-primary)]">
                      <span className="mr-1.5 text-xl font-bold">{grade}</span>
                      <span className="text-[color:var(--text-secondary)]">— {GRADE_LABELS[grade]}</span>
                    </p>
                  </div>
                )}

                {highlights.filter((h) => h.trim()).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Highlights
                    </p>
                    <ul className="space-y-1">
                      {highlights.filter((h) => h.trim()).map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {lowlights.filter((l) => l.trim()).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Areas for improvement
                    </p>
                    <ul className="space-y-1">
                      {lowlights.filter((l) => l.trim()).map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text-primary)]">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationText.trim() && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Overall summary
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {evaluationText}
                    </p>
                  </div>
                )}

                {recommendationText.trim() && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Recommendation
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
                      {recommendationText}
                    </p>
                  </div>
                )}

                {(localFiles.length > 0 || existingDocUrls.length > 0) && (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
                      Supporting documents
                    </p>
                    {localFiles.length > 0 ? (
                      localFiles.map((f) => (
                        <p key={f.name} className="flex items-center gap-1.5 text-sm text-[color:var(--text-primary)]">
                          <FileText size={13} className="flex-none text-[color:var(--text-tertiary)]" />
                          {f.name}
                        </p>
                      ))
                    ) : (
                      existingDocUrls.map((publicId, index) => (
                        <button key={publicId} type="button" onClick={() => initial && handleDownload(initial.id, index)}
                          className="flex items-center gap-1.5 text-sm text-[color:hsl(var(--primary))] underline text-left">
                          <FileText size={13} className="flex-none" />
                          {extractFilename(publicId)}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {!grade &&
                  !evaluationText.trim() &&
                  !recommendationText.trim() &&
                  highlights.filter((h) => h.trim()).length === 0 &&
                  lowlights.filter((l) => l.trim()).length === 0 && (
                    <p className="text-sm text-[color:var(--text-tertiary)]">
                      Nothing to preview yet — fill in the form to see what {previewName} will receive.
                    </p>
                  )}
              </div>
            ) : (
              // ── Editable form ────────────────────────────────────────────────
              <>
                {/* ── Details ── */}
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  Details
                </p>

                {/* Reviewee — searchable over your direct reports */}
                <FormField
                  label="Reviewee"
                  htmlFor="ev-reviewee"
                  error={errors.reviewee}
                  hint="Who are you reviewing?"
                  hintAbove
                  required
                >
                  <Combobox
                    options={reviewees.map((r) => ({
                      value: r.id,
                      label: r.fullName,
                      sublabel: r.jobTitle ?? undefined,
                    }))}
                    value={revieweeId}
                    onChange={(v) => {
                      setRevieweeId(v);
                      clearError("reviewee");
                    }}
                    placeholder="Select employee"
                    searchPlaceholder="Search direct reports…"
                    emptyText="No direct reports found."
                    className={errors.reviewee ? "border-[#D92D20]" : undefined}
                  />
                </FormField>

                {/* Evaluation period */}
                <FormField
                  label="Evaluation period"
                  htmlFor="ev-period"
                  error={errors.period}
                  hint="The window this review covers."
                  hintAbove
                  required
                >
                  <div aria-invalid={!!errors.period}>
                    <DateRangePicker
                      value={period}
                      onChange={(v) => {
                        setPeriod(v);
                        clearError("period");
                      }}
                    />
                  </div>
                </FormField>

                {/* ── Assessment ── */}
                <p className="pt-1 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  Assessment
                </p>

                {/* Highlights */}
                <DynamicList
                  label="Highlights"
                  htmlFor="ev-highlights"
                  items={highlights}
                  onChange={(v) => {
                    setHighlights(v);
                    clearError("highlights");
                  }}
                  placeholder="e.g. Shipped the billing revamp two weeks early."
                  hint="Key wins and strengths this period. Add one per line."
                  optional
                  hintAbove
                  addLabel="Add highlight"
                  maxLength={EVAL_TEXT_LIMITS.ITEM}
                  error={errors.highlights}
                />

                {/* Areas for improvement (formerly lowlights) */}
                <DynamicList
                  label="Areas for improvement"
                  htmlFor="ev-areas"
                  items={lowlights}
                  onChange={(v) => {
                    setLowlights(v);
                    clearError("lowlights");
                  }}
                  placeholder="e.g. Tickets often shipped without test coverage."
                  hint="Where there's room to grow. Keep it specific and constructive."
                  optional
                  hintAbove
                  addLabel="Add area"
                  maxLength={EVAL_TEXT_LIMITS.ITEM}
                  error={errors.lowlights}
                />

                {/* Overall summary (formerly Evaluation) */}
                <FormField
                  label="Overall summary"
                  htmlFor="ev-summary"
                  error={errors.summary}
                  hint="A short narrative tying the period together."
                  required
                  hintAbove
                >
                  <Textarea
                    id="ev-summary"
                    placeholder="How did they do overall? Pull the highlights and areas into a few sentences."
                    value={evaluationText}
                    onChange={(e) => {
                      setEvaluationText(e.target.value);
                      clearError("summary");
                    }}
                    rows={4}
                    maxLength={EVAL_TEXT_LIMITS.EVALUATION}
                    aria-invalid={!!errors.summary}
                  />
                </FormField>

                {/* Overall rating (formerly Grade) — a horizontal scale, placed after the evidence */}
                <FormField
                  label="Overall rating"
                  htmlFor="ev-rating"
                  error={errors.grade}
                  hint="Pick the level that best matches the period as a whole."
                  hintAbove
                  required
                >
                  <div className="space-y-2">
                    <div
                      role="radiogroup"
                      aria-label="Overall rating"
                      aria-invalid={!!errors.grade}
                      className="grid grid-cols-5 gap-2"
                    >
                      {RATING_OPTIONS.map((opt) => {
                        const selected = grade === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                              setGrade(opt.value);
                              clearError("grade");
                            }}
                            className={[
                              "flex flex-col items-center justify-start gap-1 rounded-lg border px-1.5 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              selected
                                ? "border-transparent bg-[color:hsl(var(--primary))] text-white"
                                : "border-[color:var(--border-primary)] hover:bg-[color:var(--bg-secondary)]",
                              errors.grade && !selected ? "border-[#D92D20]" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-label={`${opt.value}: ${opt.label}`}
                          >
                            <span className="text-lg font-bold">{opt.value}</span>
                            <span
                              className={[
                                "text-[11px] font-medium leading-tight",
                                selected ? "text-white/90" : "text-[color:var(--text-tertiary)]",
                              ].join(" ")}
                            >
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {grade && (
                      <p className="text-xs text-[color:var(--text-tertiary)]">
                        <span className="font-semibold text-[color:var(--text-secondary)]">
                          {grade} · {RATING_OPTIONS.find((o) => o.value === grade)?.label}
                        </span>{" "}
                        — {RATING_OPTIONS.find((o) => o.value === grade)?.desc}
                      </p>
                    )}
                  </div>
                </FormField>

                {/* Recommendation */}
                <FormField
                  label="Recommendation"
                  htmlFor="ev-rec"
                  hint="What should happen next? e.g. promotion, a stretch project, a development plan."
                  error={errors.recommendation}
                  optional
                  hintAbove
                >
                  <Textarea
                    id="ev-rec"
                    placeholder="What should happen next for this person?"
                    value={recommendationText}
                    onChange={(e) => {
                      setRecommendationText(e.target.value);
                      clearError("recommendation");
                    }}
                    rows={3}
                    maxLength={EVAL_TEXT_LIMITS.RECOMMENDATION}
                    aria-invalid={!!errors.recommendation}
                  />
                </FormField>

                {/* Supporting documents — PDF file picker */}
                <FormField
                  label="Supporting documents"
                  htmlFor="ev-docs"
                  hint="PDF files only · up to 5 files · 10 MB each"
                  optional
                  hintAbove
                >
                  <PdfFilePicker
                    files={localFiles}
                    existingUrls={existingDocUrls}
                    onChange={setLocalFiles}
                    error={errors.doc}
                  />
                </FormField>
              </>
            )}
          </div>

          {/* Bottom bar — the scroll region's pb keeps content off the divider above it */}
          <div className="flex items-center gap-2 border-t border-[color:var(--border-primary)] pt-4">
            {!isViewOnly && (
              <DraftSaveStatus
                status={autosave.status}
                lastSavedAt={autosave.lastSavedAt}
                canPersist={autosave.canPersist}
                onRetry={autosave.retry}
              />
            )}
            {isDraft && onRequestDelete && (
              <Button
                variant="ghost"
                type="button"
                onClick={onRequestDelete}
                className="text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#D92D20]"
              >
                <Trash2 size={14} className="mr-1" /> Delete draft
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {isViewOnly ? (
                <Button variant="secondary" type="button" onClick={onClose}>
                  Close
                </Button>
              ) : step === "form" ? (
                <>
                  <Button variant="secondary" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Wrap so the tooltip still fires while the button is disabled. */}
                        <span tabIndex={!canPersist ? 0 : undefined}>
                          <Button type="submit" disabled={!canPersist}>
                            <Eye size={14} className="mr-1" /> Preview
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canPersist ? (
                        <TooltipContent side="top">
                          Add the reviewee, evaluation period, and rating to preview.
                        </TooltipContent>
                      ) : null}
                    </Tooltip>
                  </TooltipProvider>
                </>
              ) : (
                // Preview step. No explicit "Save as draft" — the draft autosaves; Back, Cancel
                // and Send sit together as one action group.
                <>
                  <Button variant="ghost" type="button" onClick={() => setStep("form")}>
                    <ChevronLeft size={14} className="mr-1" /> Back
                  </Button>
                  <Button variant="secondary" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSend}>
                    <Send size={14} className="mr-1" /> Send
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = "ALL" | "sent" | "draft";

const PAGE_SIZE = 10;
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "reviewee", label: "Reviewee" },
  { value: "period", label: "Period" },
  { value: "grade", label: "Grade" },
  { value: "status", label: "Status" },
  { value: "due", label: "Acknowledgement due" },
];

export default function EvaluationsPage() {
  const { appUser } = useAuth();

  const { data: allEvals, isLoading, isError, refetch } = useEvaluations();
  const { data: reviewees } = useMyDirectReports();

  const createMutation = useCreateEvaluation();
  const updateMutation = useUpdateEvaluation();
  const deleteMutation = useDeleteEvaluation();
  const sendMutation = useSendEvaluation();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  // A send awaiting confirmation. `input` is present when sending from the editor (new draft is
  // created/updated first); a row-action send carries only the existing evaluation.
  const [pendingSend, setPendingSend] = useState<{
    existing: Evaluation | null;
    input?: EvaluationInput;
    name: string;
    files?: File[];
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<DataTableSort>({ key: "period", direction: "desc" });
  const [page, setPage] = useState(1);

  const revieweeList = reviewees ?? [];
  const revieweeName = (id: string) => revieweeList.find((r) => r.id === id)?.fullName ?? "—";
  const nameOf = (ev: Evaluation) => ev.reviewee?.fullName ?? revieweeName(ev.revieweeId);

  // The supervisor's own issued evaluations (drafts + sent).
  const evals = useMemo(() => {
    const list = allEvals ?? [];
    return appUser?.employeeId
      ? list.filter((e) => e.reviewerId === appUser.employeeId)
      : list;
  }, [allEvals, appUser?.employeeId]);

  const draftCount = evals.filter((e) => !e.isSent).length;
  const sentCount = evals.filter((e) => e.isSent).length;

  // Search + status filter, then sort — all client-side over this supervisor's set.
  const filtered = useMemo(() => {
    let list = evals;
    if (statusFilter === "draft") list = list.filter((e) => !e.isSent);
    else if (statusFilter === "sent") list = list.filter((e) => e.isSent);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => nameOf(e).toLowerCase().includes(q));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evals, statusFilter, search, revieweeList]);

  const sorted = useMemo(() => {
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "reviewee":
          return dir * nameOf(a).localeCompare(nameOf(b));
        case "grade":
          return dir * (a.grade - b.grade);
        case "status":
          return dir * (Number(a.isSent) - Number(b.isSent));
        case "due": {
          const ta = a.ackDeadline ? new Date(a.ackDeadline).getTime() : Infinity;
          const tb = b.ackDeadline ? new Date(b.ackDeadline).getTime() : Infinity;
          return dir * (ta - tb);
        }
        case "period":
        default:
          return dir * (new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort, revieweeList]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = Boolean(search || statusFilter !== "ALL");

  // Reset to the first page whenever the result set changes underneath us.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openRow = (ev: Evaluation) => {
    setEditing(ev);
    setEditorOpen(true);
  };

  const handleSubmit = (input: EvaluationInput, files: File[]) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, input, files },
        {
          onSuccess: () => {
            toast.success("Draft saved.");
            setEditorOpen(false);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save draft."),
        },
      );
    } else {
      createMutation.mutate(
        { input, files },
        {
          onSuccess: () => {
            toast.success("Draft evaluation created.");
            setEditorOpen(false);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create draft."),
        },
      );
    }
  };

  // Silent autosave persist: create the draft on first valid save (capturing it so the editor
  // switches to incremental updates), update it thereafter. Files are never sent here — uploads
  // happen only on an explicit Save/Send — so existing documents are preserved.
  const handleAutosave = async (
    input: EvaluationInput,
    id: string | null,
  ): Promise<string> => {
    if (id) {
      await updateMutation.mutateAsync({ id, input, files: [] });
      return id;
    }
    const created = await createMutation.mutateAsync({ input, files: [] });
    setEditing(created);
    return created.id;
  };

  const handleSend = () => {
    if (!pendingSend) return;
    const { existing, input, files = [] } = pendingSend;

    const fail = (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Could not send evaluation.");
      setPendingSend(null);
    };
    const sendById = (id: string) =>
      sendMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Evaluation sent. It is now read-only.");
          setPendingSend(null);
          setEditorOpen(false);
        },
        onError: fail,
      });

    if (existing && input) {
      // Persist the latest edits, then send.
      updateMutation.mutate(
        { id: existing.id, input, files },
        { onSuccess: () => sendById(existing.id), onError: fail },
      );
    } else if (existing) {
      // Row-action send (no unsaved edits).
      sendById(existing.id);
    } else if (input) {
      // Brand-new evaluation: create the draft, then send it.
      createMutation.mutate(
        { input, files },
        {
          onSuccess: (created) => sendById(created.id),
          onError: fail,
        },
      );
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Draft deleted.");
        setDeletingId(null);
        setEditorOpen(false);
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : "Could not delete draft.");
        setDeletingId(null);
      },
    });
  };

  const columns: Column<Evaluation>[] = [
    {
      header: "Reviewee",
      className: "min-w-[220px]",
      sortable: true,
      sortKey: "reviewee",
      cell: (ev) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[color:var(--text-primary)]"
            style={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
          >
            {revieweeInitials(nameOf(ev))}
          </span>
          <p className="min-w-0 truncate text-sm font-medium text-[color:var(--text-primary)]">
            {nameOf(ev)}
          </p>
        </div>
      ),
    },
    {
      header: "Period",
      className: "min-w-[150px] text-center whitespace-nowrap",
      sortable: true,
      sortKey: "period",
      cell: (ev) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatPeriod(ev.periodStart, ev.periodEnd)}
        </span>
      ),
    },
    {
      header: "Grade",
      className: "min-w-[140px] text-center whitespace-nowrap",
      sortable: true,
      sortKey: "grade",
      cell: (ev) => (
        <div>
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{ev.grade}</span>
          {/* Label is hidden on mobile cards — the number alone reads cleanly there. */}
          <span className="ml-1.5 hidden text-xs text-[color:var(--text-tertiary)] md:inline">
            {GRADE_LABELS[ev.grade]}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      mobileLabel: "Status",
      className: "min-w-[110px] text-center",
      sortable: true,
      sortKey: "status",
      cell: (ev) => <StatusBadge status={ev.isSent ? "SENT" : "DRAFT"} dot />,
    },
    {
      header: "Acknowledgement",
      mobileLabel: "Acknowledgement",
      className: "min-w-[150px] text-center",
      cell: (ev) => {
        const ack = ackInfo(ev);
        if (!ack) return <span className="text-xs text-[color:var(--text-quaternary)]">—</span>;
        return <StatusBadge status={ack.status} tone={ack.tone} />;
      },
    },
    {
      header: "Acknowledgement due",
      mobileLabel: "Acknowledgement due",
      className: "min-w-[160px] text-center whitespace-nowrap",
      sortable: true,
      sortKey: "due",
      cell: (ev) => {
        const deadline = ev.isSent && ev.ackDeadline ? new Date(ev.ackDeadline) : null;
        if (!deadline || Number.isNaN(deadline.getTime()))
          return <span className="text-xs text-[color:var(--text-quaternary)]">—</span>;
        return (
          <span className="text-sm text-[color:var(--text-secondary)]">
            {formatRelativeDate(ev.ackDeadline as string)}
          </span>
        );
      },
    },
  ];

  const emptyTitle = hasFilters ? "No matching evaluations" : "No evaluations yet";
  const emptyBody = hasFilters
    ? "Try a different search or status filter."
    : "Create your first evaluation for a direct report.";

  const sendingName = pendingSend?.name ?? "the employee";

  return (
    <div className="min-w-0">
      <ScreenHeader id="evaluations" level="page" />

      {/* Status sub-tabs — double as the status filter, with a live count badge each */}
      <div
        role="tablist"
        aria-label="Filter by status"
        className="mb-5 flex items-center gap-6 overflow-x-auto overflow-y-hidden scrollbar-none border-b border-[color:var(--border-primary)]"
      >
        {(
          [
            { value: "ALL", label: "All", count: evals.length },
            { value: "draft", label: "Drafts", count: draftCount },
            { value: "sent", label: "Sent", count: sentCount },
          ] as { value: StatusFilter; label: string; count: number }[]
        ).map((t) => {
          const active = statusFilter === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(t.value)}
              className={[
                "relative flex items-center gap-2 whitespace-nowrap px-1 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex min-w-[20px] items-center justify-center rounded-full border bg-[color:var(--bg-tertiary)] px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  active
                    ? "border-[color:var(--border-primary)] text-[color:var(--text-secondary)]"
                    : "border-transparent text-[color:var(--text-tertiary)]",
                ].join(" ")}
              >
                {isLoading ? "–" : t.count}
              </span>
              {/* Gradient underline — the sole active indicator. Sits over the container border. */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                  style={{ background: "var(--gradient-jia)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      <FilterBar aria-label="Filter evaluations" className="gap-3">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-[320px]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee"
              aria-label="Search evaluations"
              className="w-full pl-9"
            />
          </div>
          <div className="flex w-full gap-2 md:hidden">
            <Select
              value={sort.key}
              onValueChange={(v: string) => setSort((s) => ({ key: v, direction: s.direction }))}
            >
              <SelectTrigger className="w-full min-w-0" aria-label="Sort by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() =>
                setSort((s) => ({ key: s.key, direction: s.direction === "asc" ? "desc" : "asc" }))
              }
              aria-label={`Sort ${sort.direction === "asc" ? "descending" : "ascending"}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button onClick={openCreate} className="w-full shrink-0 sm:ml-auto sm:w-auto">
          <Plus aria-hidden="true" />
          New evaluation
        </Button>
      </FilterBar>

      {/* Table */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={pageItems}
          isLoading={isLoading}
          error={isError ? "Could not load evaluations." : null}
          onRetry={() => void refetch()}
          getRowId={(ev) => ev.id}
          onRowClick={(ev) => openRow(ev)}
          sort={sort}
          onSortChange={setSort}
          pagination={{ page, totalPages, onPageChange: setPage }}
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title={emptyTitle}
              body={emptyBody}
              action={hasFilters ? undefined : { label: "New evaluation", onClick: openCreate }}
            />
          }
        />
      </div>

      {/* Editor dialog */}
      <EvaluationEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        reviewees={revieweeList}
        onSubmit={handleSubmit}
        onRequestSend={(payload) => setPendingSend(payload)}
        onRequestDelete={() => editing && setDeletingId(editing.id)}
        onAutosave={handleAutosave}
      />

      {/* Send confirm */}
      <AlertDialog open={!!pendingSend} onOpenChange={(o) => !o && setPendingSend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once sent, it can&apos;t be edited or deleted, and {sendingName} will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={createMutation.isPending || updateMutation.isPending || sendMutation.isPending}
            >
              <Send size={14} className="mr-1" /> {sendMutation.isPending ? "Sending…" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this draft evaluation? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
