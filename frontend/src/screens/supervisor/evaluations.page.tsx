"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Pencil,
  Trash2,
  Send,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Badge,
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
import { EmptyState, DataTable, FormField, type Column } from "@/shared/ui/patterns";
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

function formatPeriod(startIso: string, endIso: string): string {
  const from = new Date(startIso);
  const to = new Date(endIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  return `${format(from, "LLL d, yyyy")} – ${format(to, "LLL d, yyyy")}`;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type AckLabel = "Pending" | "Acknowledged" | "Deemed ack." | null;

function ackInfo(ev: Evaluation): { label: AckLabel; variant: "warning" | "success" | "neutral" } {
  if (!ev.isSent) return { label: null, variant: "neutral" };
  const ack = ev.acknowledgement;
  if (ack?.acknowledgedAt && !ack.isDeemedAck) return { label: "Acknowledged", variant: "success" };
  if (ack?.isDeemedAck) return { label: "Deemed ack.", variant: "neutral" };
  return { label: "Pending", variant: "warning" };
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
  const update = (idx: number, val: string) => onChange(items.map((v, i) => (i === idx ? val : v)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, ""]);

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
      <div className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              id={idx === 0 ? htmlFor : undefined}
              value={val}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="Remove item"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button variant="secondary" size="sm" type="button" onClick={add}>
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
      setPeriod(undefined);
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
      errs.doc = "Enter a valid URL (http:// or https://).";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
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

  const title = isViewOnly ? "View evaluation" : initial ? "Edit draft" : "New evaluation";
  const description = isViewOnly
    ? "This evaluation has been sent and is now read-only."
    : "Fill in the evaluation details for your direct report. It stays editable until you send it.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Reviewee */}
          <FormField label="Reviewee" htmlFor="ev-reviewee" error={errors.reviewee} required>
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {initial?.reviewee?.fullName ?? revieweeName(revieweeId)}
              </p>
            ) : (
              <Select value={revieweeId} onValueChange={setRevieweeId}>
                <SelectTrigger id="ev-reviewee" className={errors.reviewee ? "border-[#D92D20]" : undefined}>
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
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {period?.from && period?.to
                  ? `${format(period.from, "LLL d, yyyy")} – ${format(period.to, "LLL d, yyyy")}`
                  : "—"}
              </p>
            ) : (
              <DateRangePicker value={period} onChange={setPeriod} />
            )}
          </FormField>

          {/* Grade */}
          <FormField label="Grade" htmlFor="ev-grade" error={errors.grade} required>
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {grade ? `${grade} — ${GRADE_LABELS[grade]}` : "—"}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                        grade === g
                          ? "border-[color:var(--color-brand-600)] bg-[color:var(--color-brand-600)] text-white"
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
                  className="break-all text-sm text-[color:var(--color-brand-600)] underline"
                >
                  {supportingDocUrl}
                </a>
              ) : (
                <p className="text-sm text-[color:var(--text-tertiary)]">—</p>
              )
            ) : (
              <Input
                id="ev-doc"
                type="url"
                value={supportingDocUrl}
                onChange={(e) => setSupportingDocUrl(e.target.value)}
                placeholder="https://drive.example.com/report"
                className={errors.doc ? "border-[#D92D20]" : undefined}
              />
            )}
          </FormField>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[color:var(--border-primary)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            {isViewOnly ? "Close" : "Cancel"}
          </Button>
          {!isViewOnly && (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create draft"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  // The supervisor's own issued evaluations (drafts + sent).
  const evals = useMemo(() => {
    const list = allEvals ?? [];
    return appUser?.employeeId
      ? list.filter((e) => e.reviewerId === appUser.employeeId)
      : list;
  }, [allEvals, appUser?.employeeId]);

  const revieweeList = reviewees ?? [];
  const revieweeName = (id: string) => revieweeList.find((r) => r.id === id)?.fullName ?? "—";

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
      cell: (ev) => (
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {ev.reviewee?.fullName ?? revieweeName(ev.revieweeId)}
        </p>
      ),
    },
    {
      header: "Period",
      cell: (ev) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {formatPeriod(ev.periodStart, ev.periodEnd)}
        </span>
      ),
    },
    {
      header: "Grade",
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
      cell: (ev) => (
        <Badge variant={ev.isSent ? "warning" : "neutral"}>{ev.isSent ? "Sent" : "Draft"}</Badge>
      ),
    },
    {
      header: "Acknowledgement",
      cell: (ev) => {
        const { label, variant } = ackInfo(ev);
        return label ? (
          <Badge variant={variant}>{label}</Badge>
        ) : (
          <span className="text-xs text-[color:var(--text-quaternary)]">—</span>
        );
      },
    },
    {
      header: "",
      cell: (ev) => (
        <div className="flex items-center justify-end gap-1">
          {ev.isSent ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openRow(ev);
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="View evaluation"
            >
              View <ChevronRight size={12} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openRow(ev);
                }}
                className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Edit draft"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(ev.id);
                }}
                className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Delete draft"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSendingId(ev.id);
                }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Send evaluation"
              >
                <Send size={12} /> Send
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const draftCount = evals.filter((e) => !e.isSent).length;
  const sentCount = evals.filter((e) => e.isSent).length;
  const ackedCount = evals.filter((e) => e.acknowledgement?.acknowledgedAt).length;

  return (
    <div>
      <PageHeader
        level="page"
        title="Evaluations"
        subtitle="Create and manage performance evaluations for your direct reports."
        action={
          <Button onClick={openCreate}>
            <Plus /> New evaluation
          </Button>
        }
      />

      {/* Summary strip */}
      {!isLoading && !isError && evals.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {(
            [
              { label: "Total", value: evals.length },
              { label: "Drafts", value: draftCount },
              { label: "Sent", value: sentCount },
              { label: "Acknowledged", value: ackedCount },
            ] as { label: string; value: number }[]
          ).map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-2.5"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <p className="text-xs text-[color:var(--text-tertiary)]">{label}</p>
              <p className="text-lg font-bold text-[color:var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-[color:var(--bg-tertiary)]" />
                <div className="h-2.5 w-24 rounded bg-[color:var(--bg-tertiary)]" />
              </div>
              <div className="h-5 w-16 rounded-full bg-[color:var(--bg-tertiary)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!isLoading && isError && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            Could not load evaluations.
          </span>
          <button
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <DataTable
            columns={columns}
            data={evals}
            getRowId={(ev) => ev.id}
            onRowClick={(ev) => openRow(ev)}
            emptyState={
              <EmptyState
                icon={ClipboardCheck}
                title="No evaluations yet"
                body="Create your first evaluation for a direct report."
                action={{ label: "New evaluation", onClick: openCreate }}
              />
            }
          />
        </div>
      )}

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
