"use client";

import { useState, useCallback, useEffect } from "react";
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
} from "@/shared/ui";
import { EmptyState, DataTable, FormField, type Column } from "@/shared/ui/patterns";
import { readCollection, writeCollection } from "@/shared/mock/db";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type {
  Evaluation,
  EvaluationStatus,
  DemoEmployee,
  Acknowledgement,
} from "@/shared/mock/types";

// ─── Constants ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STATUS_VARIANT: Record<EvaluationStatus, "neutral" | "warning" | "success"> = {
  DRAFT: "neutral",
  SHARED: "warning",
  ACKNOWLEDGED: "success",
  DEEMED_ACKNOWLEDGED: "neutral",
};

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  DRAFT: "Draft",
  SHARED: "Shared",
  ACKNOWLEDGED: "Acknowledged",
  DEEMED_ACKNOWLEDGED: "Deemed ack.",
};

const GRADE_LABEL: Record<number, string> = {
  1: "Unsatisfactory",
  2: "Needs improvement",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Exceptional",
};

const PERIODS = ["H1 2026", "H2 2025", "H1 2025", "Q2 2026", "Q1 2026"];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDirectReports(supervisorId: string) {
  const [reports, setReports] = useState<DemoEmployee[]>([]);
  useEffect(() => {
    const all = readCollection<DemoEmployee>("employees");
    setReports(all.filter((e) => e.supervisorId === supervisorId && e.isActive));
  }, [supervisorId]);
  return reports;
}

function useEvaluations(supervisorId: string) {
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const all = readCollection<Evaluation>("evaluations");
      setEvals(all.filter((e) => e.supervisorId === supervisorId));
    } catch {
      setError("Could not load evaluations.");
    } finally {
      setLoading(false);
    }
  }, [supervisorId]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback((ev: Evaluation) => {
    const all = readCollection<Evaluation>("evaluations");
    const idx = all.findIndex((e) => e.id === ev.id);
    const next = idx >= 0 ? all.map((e, i) => (i === idx ? ev : e)) : [...all, ev];
    writeCollection("evaluations", next);
    setEvals(next.filter((e) => e.supervisorId === supervisorId));
  }, [supervisorId]);

  const remove = useCallback((id: string) => {
    const all = readCollection<Evaluation>("evaluations");
    const next = all.filter((e) => e.id !== id);
    writeCollection("evaluations", next);
    setEvals(next.filter((e) => e.supervisorId === supervisorId));
  }, [supervisorId]);

  return { evals, loading, error, reload: load, save, remove };
}

// ─── Dynamic list helper ──────────────────────────────────────────────────────

interface DynamicListProps {
  label: string;
  htmlFor: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  readOnly?: boolean;
}

function DynamicList({ label, htmlFor, items, onChange, placeholder, readOnly }: DynamicListProps) {
  const update = (idx: number, val: string) =>
    onChange(items.map((v, i) => (i === idx ? val : v)));
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, ""]);

  return (
    <FormField label={label} htmlFor={htmlFor}>
      <div className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {readOnly ? (
              <p className="flex-1 rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {val}
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button variant="secondary" size="sm" type="button" onClick={add}>
            <Plus size={12} /> Add
          </Button>
        )}
      </div>
    </FormField>
  );
}

// ─── Evaluation editor dialog ─────────────────────────────────────────────────

interface EditorProps {
  open: boolean;
  onClose: () => void;
  initial: Evaluation | null;
  supervisorId: string;
  onSave: (ev: Evaluation) => void;
}

function EvaluationEditorDialog({ open, onClose, initial, supervisorId, onSave }: EditorProps) {
  const reports = useDirectReports(supervisorId);

  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState("H1 2026");
  const [grade, setGrade] = useState<number | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [lowlights, setLowlights] = useState<string[]>([]);
  const [evaluationText, setEvaluationText] = useState("");
  const [recommendationText, setRecommendationText] = useState("");
  const [supportingDocs, setSupportingDocs] = useState<string[]>([]);
  const [newDoc, setNewDoc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isViewOnly =
    initial?.status === "SHARED" ||
    initial?.status === "ACKNOWLEDGED" ||
    initial?.status === "DEEMED_ACKNOWLEDGED";

  useEffect(() => {
    if (open) {
      if (initial) {
        setEmployeeId(initial.employeeId);
        setPeriod(initial.period);
        setGrade(initial.grade ?? null);
        setHighlights(initial.highlights ?? []);
        setLowlights(initial.lowlights ?? []);
        setEvaluationText(initial.evaluationText ?? "");
        setRecommendationText(initial.recommendationText ?? "");
        setSupportingDocs(initial.supportingDocs ?? []);
      } else {
        setEmployeeId(reports[0]?.employeeId ?? "");
        setPeriod("H1 2026");
        setGrade(null);
        setHighlights([]);
        setLowlights([]);
        setEvaluationText("");
        setRecommendationText("");
        setSupportingDocs([]);
      }
      setNewDoc("");
      setErrors({});
    }
  }, [open, initial, reports]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!employeeId) errs.employee = "Select an employee.";
    if (!grade) errs.grade = "Select a grade.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddDoc = () => {
    const trimmed = newDoc.trim();
    if (!trimmed) return;
    setSupportingDocs((d) => [...d, trimmed]);
    setNewDoc("");
  };

  const handleSave = () => {
    if (!validate()) return;
    const ev: Evaluation = {
      id: initial?.id ?? uid(),
      employeeId,
      supervisorId,
      period,
      status: "DRAFT",
      sharedAt: initial?.sharedAt ?? null,
      grade: grade ?? undefined,
      highlights,
      lowlights,
      evaluationText: evaluationText.trim() || undefined,
      recommendationText: recommendationText.trim() || undefined,
      supportingDocs: supportingDocs.length > 0 ? supportingDocs : undefined,
      ratings: initial?.ratings,
      summary: initial?.summary,
    };
    onSave(ev);
    onClose();
  };

  const reportName = (id: string) =>
    reports.find((r) => r.employeeId === id)?.displayName ?? id;

  const dialogTitle = isViewOnly
    ? "View evaluation"
    : initial
    ? "Edit evaluation"
    : "New evaluation";

  const dialogDescription = isViewOnly
    ? "This evaluation has been shared and is now read-only."
    : "Fill in the evaluation details for your direct report.";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Employee */}
          <FormField label="Employee" htmlFor="ev-emp" error={errors.employee} required>
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {reportName(employeeId)}
              </p>
            ) : (
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!initial}>
                <SelectTrigger
                  id="ev-emp"
                  className={errors.employee ? "border-[#D92D20]" : undefined}
                >
                  <SelectValue placeholder="Select direct report…" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.employeeId} value={r.employeeId}>
                      {r.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {/* Period */}
          <FormField label="Period" htmlFor="ev-period">
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {period}
              </p>
            ) : (
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="ev-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>

          {/* Grade */}
          <FormField label="Grade" htmlFor="ev-grade" error={errors.grade} required>
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                {grade ? `${grade} — ${GRADE_LABEL[grade]}` : "—"}
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
                      aria-label={`Grade ${g}: ${GRADE_LABEL[g]}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {grade && (
                  <p className="text-xs text-[color:var(--text-tertiary)]">{GRADE_LABEL[grade]}</p>
                )}
              </div>
            )}
          </FormField>

          {/* Highlights */}
          <DynamicList
            label="Key highlights"
            htmlFor="ev-highlights"
            items={highlights}
            onChange={setHighlights}
            placeholder="Add a highlight…"
            readOnly={isViewOnly}
          />

          {/* Lowlights */}
          <DynamicList
            label="Areas for growth"
            htmlFor="ev-lowlights"
            items={lowlights}
            onChange={setLowlights}
            placeholder="Add an area for growth…"
            readOnly={isViewOnly}
          />

          {/* Evaluation text */}
          <FormField label="Evaluation narrative" htmlFor="ev-text">
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm leading-relaxed">
                {evaluationText || "—"}
              </p>
            ) : (
              <Textarea
                id="ev-text"
                placeholder="Written narrative of performance…"
                value={evaluationText}
                onChange={(e) => setEvaluationText(e.target.value)}
                rows={4}
              />
            )}
          </FormField>

          {/* Recommendation text */}
          <FormField label="Recommendation" htmlFor="ev-rec">
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm leading-relaxed">
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

          {/* Supporting docs */}
          <FormField label="Supporting documents" htmlFor="ev-doc">
            <div className="space-y-2">
              {supportingDocs.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <p className="flex-1 rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">
                    {doc}
                  </p>
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => setSupportingDocs((d) => d.filter((_, i) => i !== idx))}
                      className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
                      aria-label="Remove document"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!isViewOnly && (
                <div className="flex gap-2">
                  <Input
                    id="ev-doc"
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value)}
                    placeholder="Document name…"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDoc();
                      }
                    }}
                  />
                  <Button variant="secondary" type="button" onClick={handleAddDoc}>
                    Add
                  </Button>
                </div>
              )}
              {isViewOnly && supportingDocs.length === 0 && (
                <p className="text-sm text-[color:var(--text-tertiary)]">—</p>
              )}
            </div>
          </FormField>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-[color:var(--border-primary)] pt-4">
          <Button variant="secondary" onClick={onClose}>
            {isViewOnly ? "Close" : "Cancel"}
          </Button>
          {!isViewOnly && (
            <Button onClick={handleSave}>
              {initial ? "Save changes" : "Create draft"}
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
  const supervisorId = appUser?.employeeId ?? "e-sup";

  const { evals, loading, error, reload, save, remove } = useEvaluations(supervisorId);
  const reports = useDirectReports(supervisorId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Read acknowledgements once for ack sub-status display
  const [acks, setAcks] = useState<Acknowledgement[]>([]);
  useEffect(() => {
    setAcks(readCollection<Acknowledgement>("acknowledgements"));
  }, [evals]);

  const reportName = (id: string) =>
    reports.find((r) => r.employeeId === id)?.displayName ?? id;

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (ev: Evaluation) => {
    setEditing(ev);
    setEditorOpen(true);
  };

  const handleSave = (ev: Evaluation) => {
    save(ev);
    toast.success(editing ? "Evaluation saved." : "Draft evaluation created.");
  };

  const handleShare = () => {
    if (!sharingId) return;
    const all = readCollection<Evaluation>("evaluations");
    const ev = all.find((e) => e.id === sharingId);
    if (!ev) return;

    const sharedAt = new Date().toISOString();
    const ackDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const updated: Evaluation = { ...ev, status: "SHARED", sharedAt, ackDeadline };
    save(updated);

    const existingAcks = readCollection<Acknowledgement>("acknowledgements");
    const exists = existingAcks.some((a) => a.evaluationId === sharingId);
    if (!exists) {
      writeCollection("acknowledgements", [
        ...existingAcks,
        {
          id: uid(),
          evaluationId: sharingId,
          employeeId: ev.employeeId,
          acknowledgedAt: null,
          deemedAt: null,
        },
      ]);
    }

    setSharingId(null);
    toast.success("Evaluation shared with the employee.");
  };

  const handleDelete = () => {
    if (!deletingId) return;
    remove(deletingId);
    setDeletingId(null);
    toast.success("Draft deleted.");
  };

  const getAckSubStatus = (ev: Evaluation): "Pending" | "Acknowledged" | "Deemed" | null => {
    if (ev.status !== "SHARED") return null;
    const ack = acks.find((a) => a.evaluationId === ev.id);
    if (!ack) return "Pending";
    if (ack.acknowledgedAt) return "Acknowledged";
    if (ack.deemedAt) return "Deemed";
    return "Pending";
  };

  const columns: Column<Evaluation>[] = [
    {
      header: "Employee",
      cell: (ev) => (
        <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
          {reportName(ev.employeeId)}
        </p>
      ),
    },
    {
      header: "Period",
      cell: (ev) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{ev.period}</span>
      ),
    },
    {
      header: "Grade",
      cell: (ev) =>
        ev.grade ? (
          <div>
            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
              {ev.grade}
            </span>
            <span className="ml-1.5 text-xs text-[color:var(--text-tertiary)]">
              {GRADE_LABEL[ev.grade]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[color:var(--text-quaternary)]">—</span>
        ),
    },
    {
      header: "Status",
      cell: (ev) => (
        <Badge variant={STATUS_VARIANT[ev.status]}>{STATUS_LABEL[ev.status]}</Badge>
      ),
    },
    {
      header: "Shared",
      cell: (ev) => (
        <span className="text-xs text-[color:var(--text-tertiary)]">
          {ev.sharedAt ? new Date(ev.sharedAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Ack status",
      cell: (ev) => {
        const sub = getAckSubStatus(ev);
        if (!sub) return <span className="text-xs text-[color:var(--text-quaternary)]">—</span>;
        const variant =
          sub === "Acknowledged" ? "success" : sub === "Deemed" ? "neutral" : "warning";
        return <Badge variant={variant}>{sub}</Badge>;
      },
    },
    {
      header: "",
      cell: (ev) => (
        <div className="flex items-center justify-end gap-1">
          {ev.status === "DRAFT" && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Edit evaluation"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDeletingId(ev.id); }}
                className="rounded-lg p-1.5 text-[color:var(--text-quaternary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Delete evaluation"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSharingId(ev.id); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Share evaluation"
              >
                <Send size={12} /> Share
              </button>
            </>
          )}
          {(ev.status === "SHARED" ||
            ev.status === "ACKNOWLEDGED" ||
            ev.status === "DEEMED_ACKNOWLEDGED") && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              aria-label="View evaluation"
            >
              View <ChevronRight size={12} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const drafts = evals.filter((e) => e.status === "DRAFT").length;
  const sharedPending = evals.filter((e) => e.status === "SHARED").length;
  const acknowledged = evals.filter(
    (e) => e.status === "ACKNOWLEDGED" || e.status === "DEEMED_ACKNOWLEDGED",
  ).length;

  return (
    <div>
      <PageHeader
        level="page"
        title="Evaluations"
        subtitle="Manage performance evaluations for your direct reports."
        action={
          <Button onClick={openCreate}>
            <Plus /> New evaluation
          </Button>
        }
      />

      {/* Summary strip */}
      {!loading && !error && evals.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {(
            [
              { label: "Total", value: evals.length },
              { label: "Drafts", value: drafts },
              { label: "Shared pending ack", value: sharedPending },
              { label: "Acknowledged", value: acknowledged },
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
      {loading && (
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
      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <button
            onClick={() => void reload()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <DataTable
            columns={columns}
            data={evals}
            getRowId={(ev) => ev.id}
            onRowClick={(ev) => openEdit(ev)}
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
        supervisorId={supervisorId}
        onSave={handleSave}
      />

      {/* Share confirm */}
      <AlertDialog open={!!sharingId} onOpenChange={(o) => !o && setSharingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share this evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              Once shared, the evaluation is visible to the employee and cannot be edited or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleShare}>
              <Send size={14} className="mr-1" /> Share evaluation
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
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
