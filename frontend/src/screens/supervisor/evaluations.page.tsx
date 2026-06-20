"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, startOfMonth, endOfMonth, isBefore } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  ChevronLeft,
  ArrowUpDown,
  FileText,
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
  TablePagination,
  type Column,
  type DataTableSort,
} from "@/shared/ui/patterns";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** A period interval, hyphen-separated. Drops the year when both ends fall in the current year. */
function formatPeriod(startIso: string, endIso: string): string {
  const from = new Date(startIso);
  const to = new Date(endIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  const currentYear = new Date().getFullYear();
  const sameYear = from.getFullYear() === currentYear && to.getFullYear() === currentYear;
  const fmt = sameYear ? "LLL d" : "LLL d, yyyy";
  return `${format(from, fmt)} - ${format(to, fmt)}`;
}

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

type AckTone = "warning" | "success" | "info" | "error";

/** Acknowledgement status for the table, surfacing the deadline / overdue signal. */
function ackInfo(
  ev: Evaluation,
): { status: string; tone: AckTone; note: string | null } | null {
  if (!ev.isSent) return null;
  const ack = ev.acknowledgement;
  if (ack?.acknowledgedAt && !ack.isDeemedAck) return { status: "ACKNOWLEDGED", tone: "success", note: null };
  if (ack?.isDeemedAck) return { status: "DEEMED_ACK", tone: "info", note: null };
  // Still pending — escalate to overdue once the ack deadline has passed.
  const deadline = ev.ackDeadline ? new Date(ev.ackDeadline) : null;
  const validDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;
  if (validDeadline && isBefore(validDeadline, new Date())) {
    return { status: "OVERDUE", tone: "error", note: `due ${format(validDeadline, "LLL d")}` };
  }
  return {
    status: "PENDING",
    tone: "warning",
    note: validDeadline ? `due ${format(validDeadline, "LLL d")}` : null,
  };
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
}

function DynamicList({ label, htmlFor, items, onChange, placeholder, hint, optional, hintAbove, addLabel = "Add", readOnly }: DynamicListProps) {
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
    <FormField label={label} htmlFor={htmlFor} hint={hint} optional={optional} hintAbove={hintAbove}>
      <div ref={listRef} className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              id={idx === 0 ? htmlFor : undefined}
              value={val}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
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
  saving: boolean;
  onSubmit: (input: EvaluationInput, files: File[]) => void;
  onRequestSend: (payload: SendPayload) => void;
}

function EvaluationEditorDialog({
  open,
  onClose,
  initial,
  reviewees,
  saving,
  onSubmit,
  onRequestSend,
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

  useEffect(() => {
    if (!open) return;
    setStep("form");
    if (initial) {
      setRevieweeId(initial.revieweeId);
      setPeriod({ from: new Date(initial.periodStart), to: new Date(initial.periodEnd) });
      setGrade(initial.grade ?? null);
      setHighlights(initial.highlights ?? []);
      setLowlights(initial.lowlights ?? []);
      setEvaluationText(initial.evaluation ?? "");
      setRecommendationText(initial.recommendation ?? "");
      setExistingDocUrls(initial.supportingDocUrls ?? []);
      setLocalFiles([]);
    } else {
      // Reviewee starts empty (placeholder "Select employee").
      setRevieweeId("");
      // Smart default: prefill the current month as the evaluation period.
      const now = new Date();
      setPeriod({ from: startOfMonth(now), to: endOfMonth(now) });
      setGrade(null);
      setHighlights([]);
      setLowlights([]);
      setEvaluationText("");
      setRecommendationText("");
      setExistingDocUrls([]);
      setLocalFiles([]);
    }
    setErrors({});
  }, [open, initial, reviewees]);

  /** Required to create/save a draft: reviewee, period, and rating. */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
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

  const handleSubmit = () => {
    if (isViewOnly) return;
    const input = validate() ? buildInput() : null;
    if (!input) {
      setStep("form");
      return;
    }
    onSubmit(input, localFiles);
  };

  /** Sending is irreversible — require reviewee, period, rating, and an overall summary, pointing at
   *  the exact missing field. Works for a brand-new evaluation too (the page creates then sends). */
  const handleSend = () => {
    if (isViewOnly) return;
    const errs: Record<string, string> = {};
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
    onRequestSend({ existing: initial, input, name: previewName, files: localFiles });
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="dialog-pop flex max-h-[90vh] flex-col gap-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Form step → advance to the preview; preview step → save as a draft.
            if (!isViewOnly && step === "form") setStep("preview");
            else handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Scroll region — full-bleed so the thin scrollbar sits at the modal edge,
              while content stays padded in line with the header. */}
          <div className="-mx-6 mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-1 scrollbar-thin">
            {showPreview ? (
              // ── Employee-facing preview ──────────────────────────────────────
              <div
                className="space-y-5 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {previewPeriod} · Performance evaluation
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">For {previewName}</p>
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
                  onChange={setHighlights}
                  placeholder="e.g. Shipped the billing revamp two weeks early."
                  hint="Key wins and strengths this period. Add one per line."
                  optional
                  hintAbove
                  addLabel="Add highlight"
                />

                {/* Areas for improvement (formerly lowlights) */}
                <DynamicList
                  label="Areas for improvement"
                  htmlFor="ev-areas"
                  items={lowlights}
                  onChange={setLowlights}
                  placeholder="e.g. Tickets often shipped without test coverage."
                  hint="Where there's room to grow. Keep it specific and constructive."
                  optional
                  hintAbove
                  addLabel="Add area"
                />

                {/* Overall summary (formerly Evaluation) */}
                <FormField
                  label="Overall summary"
                  htmlFor="ev-summary"
                  error={errors.summary}
                  hint="A short narrative tying the period together."
                  optional
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
                  optional
                  hintAbove
                >
                  <Textarea
                    id="ev-rec"
                    placeholder="What should happen next for this person?"
                    value={recommendationText}
                    onChange={(e) => setRecommendationText(e.target.value)}
                    rows={3}
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

          {/* Bottom bar — divider sits flush with the scroll edge (no gap above the line) */}
          <div className="flex items-center gap-2 border-t border-[color:var(--border-primary)] pt-4">
            {!isViewOnly && step === "preview" && (
              <Button variant="ghost" type="button" onClick={() => setStep("form")}>
                <ChevronLeft size={14} className="mr-1" /> Back
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {isViewOnly ? (
                <Button variant="secondary" type="button" onClick={onClose}>
                  Close
                </Button>
              ) : step === "form" ? (
                <>
                  <Button variant="secondary" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Eye size={14} className="mr-1" /> Preview
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="secondary" disabled={saving}>
                    {saving ? "Saving…" : "Save as draft"}
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

type StatusFilter = "ALL" | "sent" | "draft" | "answered";

const PAGE_SIZE = 10;
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "reviewee", label: "Reviewee" },
  { value: "period", label: "Period" },
  { value: "grade", label: "Grade" },
  { value: "status", label: "Status" },
  { value: "due", label: "Due date" },
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
  const ackedCount = evals.filter((e) => e.acknowledgement?.acknowledgedAt).length;

  // Search + status filter, then sort — all client-side over this supervisor's set.
  const filtered = useMemo(() => {
    let list = evals;
    if (statusFilter === "draft") list = list.filter((e) => !e.isSent);
    else if (statusFilter === "sent") list = list.filter((e) => e.isSent);
    else if (statusFilter === "answered")
      list = list.filter((e) => !!e.acknowledgement?.acknowledgedAt);
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
      sortable: true,
      sortKey: "reviewee",
      cell: (ev) => (
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {nameOf(ev)}
        </p>
      ),
    },
    {
      header: "Period",
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
      sortable: true,
      sortKey: "grade",
      cell: (ev) => (
        <div>
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">{ev.grade}</span>
          <span className="ml-1.5 text-xs text-[color:var(--text-tertiary)]">
            {GRADE_LABELS[ev.grade]}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      mobileLabel: "Status",
      sortable: true,
      sortKey: "status",
      cell: (ev) => <StatusBadge status={ev.isSent ? "SENT" : "DRAFT"} dot />,
    },
    {
      header: "Acknowledgement",
      mobileLabel: "Acknowledgement",
      cell: (ev) => {
        const ack = ackInfo(ev);
        if (!ack) return <span className="text-xs text-[color:var(--text-quaternary)]">—</span>;
        return <StatusBadge status={ack.status} tone={ack.tone} />;
      },
    },
    {
      header: "Due date",
      mobileLabel: "Due date",
      sortable: true,
      sortKey: "due",
      cell: (ev) => {
        const deadline = ev.isSent && ev.ackDeadline ? new Date(ev.ackDeadline) : null;
        if (!deadline || Number.isNaN(deadline.getTime()))
          return <span className="text-xs text-[color:var(--text-quaternary)]">—</span>;
        const overdue = ackInfo(ev)?.status === "OVERDUE";
        return (
          <span
            className={
              overdue
                ? "text-sm font-medium text-[#B42318]"
                : "text-sm text-[color:var(--text-secondary)]"
            }
          >
            {formatRelativeDate(ev.ackDeadline as string)}
          </span>
        );
      },
    },
    {
      header: "",
      mobileFooter: true,
      className: "w-[1%] whitespace-nowrap text-right",
      cell: (ev) => (
        <div className="flex w-full justify-end">
          <div className="inline-flex items-center gap-1">
            {ev.isSent ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
                onClick={(e) => {
                  e.stopPropagation();
                  openRow(ev);
                }}
                aria-label="View evaluation"
                title="View evaluation"
              >
                <Eye className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[color:var(--text-tertiary)] hover:bg-gray-50 hover:text-[color:var(--text-secondary)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRow(ev);
                  }}
                  aria-label="Edit draft"
                  title="Edit draft"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[color:hsl(var(--primary))] hover:bg-gray-50 hover:text-[color:hsl(var(--primary))]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingSend({ existing: ev, name: nameOf(ev) });
                  }}
                  aria-label="Send evaluation"
                  title="Send evaluation"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#D92D20] hover:bg-[#FEF3F2] hover:text-[#D92D20]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(ev.id);
                  }}
                  aria-label="Delete draft"
                  title="Delete draft"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ),
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
        className="mb-5 flex items-center gap-6 overflow-x-auto border-b border-[color:var(--border-primary)]"
      >
        {(
          [
            { value: "ALL", label: "All", count: evals.length },
            { value: "sent", label: "Sent", count: sentCount },
            { value: "draft", label: "Drafts", count: draftCount },
            { value: "answered", label: "Answered", count: ackedCount },
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
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reviewee…"
            aria-label="Search evaluations"
            className="w-full sm:max-w-[320px]"
          />
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
        className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
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
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title={emptyTitle}
              body={emptyBody}
              action={hasFilters ? undefined : { label: "New evaluation", onClick: openCreate }}
            />
          }
        />
        {totalPages > 1 && (
          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      {/* Editor dialog */}
      <EvaluationEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        reviewees={revieweeList}
        saving={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
        onRequestSend={(payload) => setPendingSend(payload)}
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
