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
  ArrowUpDown,
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

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

// ─── Itemized text list (highlights / lowlights) ────────────────────────────────

interface DynamicListProps {
  label: string;
  htmlFor: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function DynamicList({ label, htmlFor, items, onChange, placeholder, readOnly }: DynamicListProps) {
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
    <FormField label={label} htmlFor={htmlFor}>
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
          <Plus size={12} /> Add
        </Button>
      </div>
    </FormField>
  );
}

// ─── Evaluation editor dialog ─────────────────────────────────────────────────

interface EditorProps {
  open: boolean;
  onClose: () => void;
  initial: Evaluation | null;
  reviewees: Reviewee[];
  saving: boolean;
  onSubmit: (input: EvaluationInput) => void;
}

function EvaluationEditorDialog({ open, onClose, initial, reviewees, saving, onSubmit }: EditorProps) {
  const [revieweeId, setRevieweeId] = useState("");
  const [period, setPeriod] = useState<DateRange | undefined>();
  const [grade, setGrade] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [lowlights, setLowlights] = useState<string[]>([]);
  const [evaluationText, setEvaluationText] = useState("");
  const [recommendationText, setRecommendationText] = useState("");
  const [supportingDocUrl, setSupportingDocUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isViewOnly = initial?.isSent ?? false;

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
    if (initial) {
      setRevieweeId(initial.revieweeId);
      setPeriod({ from: new Date(initial.periodStart), to: new Date(initial.periodEnd) });
      setGrade(initial.grade ?? null);
      setHighlights(initial.highlights ?? []);
      setLowlights(initial.lowlights ?? []);
      setEvaluationText(initial.evaluation ?? "");
      setRecommendationText(initial.recommendation ?? "");
      setSupportingDocUrl(initial.supportingDocUrl ?? "");
    } else {
      setRevieweeId(reviewees[0]?.id ?? "");
      // Smart default: prefill the current month as the evaluation period.
      const now = new Date();
      setPeriod({ from: startOfMonth(now), to: endOfMonth(now) });
      setGrade(null);
      setHighlights([]);
      setLowlights([]);
      setEvaluationText("");
      setRecommendationText("");
      setSupportingDocUrl("");
    }
    setErrors({});
  }, [open, initial, reviewees]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!revieweeId) errs.reviewee = "Select a direct report.";
    if (!period?.from || !period?.to) errs.period = "Select an evaluation period.";
    if (!grade) errs.grade = "Select a grade.";
    if (supportingDocUrl.trim() && !isValidUrl(supportingDocUrl.trim()))
      errs.doc = "Enter a valid URL starting with http:// or https://.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (isViewOnly) return;
    if (!validate() || !period?.from || !period?.to) return;
    const input: EvaluationInput = {
      revieweeId,
      periodStart: period.from.toISOString(),
      periodEnd: period.to.toISOString(),
      grade: grade as number,
      highlights: highlights.map((h) => h.trim()).filter(Boolean),
      lowlights: lowlights.map((l) => l.trim()).filter(Boolean),
      evaluation: evaluationText.trim() || undefined,
      recommendation: recommendationText.trim() || undefined,
      supportingDocUrl: supportingDocUrl.trim() || undefined,
    };
    onSubmit(input);
  };

  const revieweeName = (id: string) => reviewees.find((r) => r.id === id)?.fullName ?? id;
  const draftDocValid = !!supportingDocUrl.trim() && isValidUrl(supportingDocUrl.trim());

  const title = isViewOnly ? "View evaluation" : initial ? "Edit draft" : "New evaluation";
  const description = isViewOnly
    ? "This evaluation has been sent and is now read-only."
    : "Fill in the evaluation details for your direct report. It stays editable until you send it.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="-mx-1 mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-1">
            {/* Summary group: reviewee / period / grade */}
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              Summary
            </p>

            {/* Reviewee */}
            <FormField label="Reviewee" htmlFor="ev-reviewee" error={errors.reviewee} required>
              {isViewOnly ? (
                <p className="text-sm text-[color:var(--text-primary)]">
                  {initial?.reviewee?.fullName ?? revieweeName(revieweeId)}
                </p>
              ) : (
                <Select
                  value={revieweeId}
                  onValueChange={(v) => {
                    setRevieweeId(v);
                    clearError("reviewee");
                  }}
                >
                  <SelectTrigger
                    id="ev-reviewee"
                    aria-invalid={!!errors.reviewee}
                    className={errors.reviewee ? "border-[#D92D20]" : undefined}
                  >
                    <SelectValue placeholder="Select direct report…" />
                  </SelectTrigger>
                  <SelectContent>
                    {reviewees.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.fullName}
                        {r.jobTitle ? ` · ${r.jobTitle}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            {/* Evaluation period */}
            <FormField label="Evaluation period" htmlFor="ev-period" error={errors.period} required>
              {isViewOnly ? (
                <p className="text-sm text-[color:var(--text-primary)]">
                  {period?.from && period?.to
                    ? formatPeriod(period.from.toISOString(), period.to.toISOString())
                    : "—"}
                </p>
              ) : (
                <div aria-invalid={!!errors.period}>
                  <DateRangePicker
                    value={period}
                    onChange={(v) => {
                      setPeriod(v);
                      clearError("period");
                    }}
                  />
                </div>
              )}
            </FormField>

            {/* Grade */}
            <FormField label="Grade" htmlFor="ev-grade" error={errors.grade} required>
              {isViewOnly ? (
                <p className="text-sm text-[color:var(--text-primary)]">
                  {grade ? `${grade} — ${GRADE_LABELS[grade]}` : "—"}
                </p>
              ) : (
                <div className="space-y-2">
                  <div
                    role="radiogroup"
                    aria-label="Grade"
                    aria-invalid={!!errors.grade}
                    className="flex gap-2"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={grade === g}
                        onClick={() => {
                          setGrade(g);
                          clearError("grade");
                        }}
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          grade === g
                            ? "border-[color:hsl(var(--primary))] bg-[color:hsl(var(--primary))] text-white"
                            : "border-[color:var(--border-primary)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]",
                          errors.grade ? "border-[#D92D20]" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-label={`Grade ${g}: ${GRADE_LABELS[g]}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  {grade && (
                    <p className="text-xs text-[color:var(--text-tertiary)]">{GRADE_LABELS[grade]}</p>
                  )}
                </div>
              )}
            </FormField>

            {/* Assessment group: narrative fields */}
            <div className="border-t border-[color:var(--border-primary)] pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Assessment
              </p>
            </div>

            {/* Highlights */}
            <DynamicList
              label="Highlights"
              htmlFor="ev-highlights"
              items={highlights}
              onChange={setHighlights}
              placeholder="Add a highlight…"
              readOnly={isViewOnly}
            />

            {/* Lowlights */}
            <DynamicList
              label="Lowlights"
              htmlFor="ev-lowlights"
              items={lowlights}
              onChange={setLowlights}
              placeholder="Add an area for growth…"
              readOnly={isViewOnly}
            />

            {/* Evaluation narrative */}
            <FormField label="Evaluation" htmlFor="ev-text">
              {isViewOnly ? (
                <p className="whitespace-pre-line rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm leading-relaxed">
                  {evaluationText || "—"}
                </p>
              ) : (
                <Textarea
                  id="ev-text"
                  placeholder="Written assessment of performance…"
                  value={evaluationText}
                  onChange={(e) => setEvaluationText(e.target.value)}
                  rows={4}
                />
              )}
            </FormField>

            {/* Recommendation */}
            <FormField label="Recommendation" htmlFor="ev-rec">
              {isViewOnly ? (
                <p className="whitespace-pre-line rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm leading-relaxed">
                  {recommendationText || "—"}
                </p>
              ) : (
                <Textarea
                  id="ev-rec"
                  placeholder="Recommendation for the employee…"
                  value={recommendationText}
                  onChange={(e) => setRecommendationText(e.target.value)}
                  rows={3}
                />
              )}
            </FormField>

            {/* Supporting document URL */}
            <FormField
              label="Supporting document"
              htmlFor="ev-doc"
              error={errors.doc}
              hint={isViewOnly ? undefined : "Optional link (http:// or https://)"}
            >
              {isViewOnly ? (
                supportingDocUrl ? (
                  <a
                    href={supportingDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-[color:hsl(var(--primary))] underline"
                  >
                    {supportingDocUrl}
                  </a>
                ) : (
                  <p className="text-sm text-[color:var(--text-tertiary)]">—</p>
                )
              ) : (
                <div className="space-y-1.5">
                  <Input
                    id="ev-doc"
                    type="url"
                    value={supportingDocUrl}
                    onChange={(e) => {
                      setSupportingDocUrl(e.target.value);
                      clearError("doc");
                    }}
                    placeholder="https://drive.example.com/report"
                    error={!!errors.doc}
                    aria-invalid={!!errors.doc}
                  />
                  {draftDocValid && (
                    <a
                      href={supportingDocUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-[color:hsl(var(--primary))] underline"
                    >
                      Open link
                    </a>
                  )}
                </div>
              )}
            </FormField>
          </div>

          <div className="mt-5 flex justify-end gap-2 border-t border-[color:var(--border-primary)] pt-4">
            <Button variant="secondary" type="button" onClick={onClose}>
              {isViewOnly ? "Close" : "Cancel"}
            </Button>
            {!isViewOnly && (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : initial ? "Save changes" : "Create draft"}
              </Button>
            )}
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
  const [sendingId, setSendingId] = useState<string | null>(null);
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

  const handleSubmit = (input: EvaluationInput) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, input },
        {
          onSuccess: () => {
            toast.success("Draft saved.");
            setEditorOpen(false);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save draft."),
        },
      );
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success("Draft evaluation created.");
          setEditorOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create draft."),
      });
    }
  };

  const handleSend = () => {
    if (!sendingId) return;
    sendMutation.mutate(sendingId, {
      onSuccess: () => {
        toast.success("Evaluation sent. It is now read-only.");
        setSendingId(null);
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : "Could not send evaluation.");
        setSendingId(null);
      },
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => {
        toast.success("Draft deleted.");
        setDeletingId(null);
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
                    setSendingId(ev.id);
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
                "relative -mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-[color:hsl(var(--primary))] text-[color:var(--text-primary)]"
                  : "border-transparent text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                  active
                    ? "bg-[color:hsl(var(--primary))] text-white"
                    : "bg-[color:var(--bg-tertiary)] text-[color:var(--text-tertiary)]",
                ].join(" ")}
              >
                {isLoading ? "–" : t.count}
              </span>
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
      />

      {/* Send confirm */}
      <AlertDialog open={!!sendingId} onOpenChange={(o) => !o && setSendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once sent, the evaluation is delivered to the employee and can no longer be edited or
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sendMutation.isPending}>
              <Send size={14} className="mr-1" /> {sendMutation.isPending ? "Sending…" : "Send evaluation"}
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
