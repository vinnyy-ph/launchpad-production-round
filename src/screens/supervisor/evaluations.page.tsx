"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ClipboardCheck,
  Plus,
  Pencil,
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
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@/shared/ui";
import { EmptyState, DataTable, FormField, type Column } from "@/shared/ui/patterns";
import { readCollection, writeCollection } from "@/shared/mock/db";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import type {
  Evaluation,
  EvaluationStatus,
  EvaluationRating,
  DemoEmployee,
  Acknowledgement,
} from "@/shared/mock/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const STATUS_VARIANT: Record<EvaluationStatus, "neutral" | "warning" | "success"> = {
  DRAFT: "neutral",
  SHARED: "warning",
  ACKNOWLEDGED: "success",
};

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  DRAFT: "Draft",
  SHARED: "Shared",
  ACKNOWLEDGED: "Acknowledged",
};

const DEFAULT_COMPETENCIES = ["Delivery", "Collaboration", "Growth"];

const PERIODS = ["H1 2026", "H2 2025", "H1 2025", "Q2 2026", "Q1 2026"];

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Direct reports of the given supervisorId (ACTIVE or OFFBOARDING employees). */
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

  return { evals, loading, error, reload: load, save };
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
  const [ratings, setRatings] = useState<EvaluationRating[]>(
    DEFAULT_COMPETENCIES.map((c) => ({ competency: c, score: 3 })),
  );
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isViewOnly = initial?.status === "SHARED" || initial?.status === "ACKNOWLEDGED";

  useEffect(() => {
    if (open) {
      if (initial) {
        setEmployeeId(initial.employeeId);
        setPeriod(initial.period);
        setRatings(initial.ratings.map((r) => ({ ...r })));
        setSummary(initial.summary);
      } else {
        setEmployeeId(reports[0]?.employeeId ?? "");
        setPeriod("H1 2026");
        setRatings(DEFAULT_COMPETENCIES.map((c) => ({ competency: c, score: 3 })));
        setSummary("");
      }
      setErrors({});
    }
  }, [open, initial, reports]);

  const updateRating = (competency: string, score: number) =>
    setRatings((rs) => rs.map((r) => (r.competency === competency ? { ...r, score } : r)));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!employeeId) errs.employee = "Select an employee.";
    if (!summary.trim()) errs.summary = "Summary is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const ev: Evaluation = {
      id: initial?.id ?? uid(),
      employeeId,
      supervisorId,
      period,
      status: "DRAFT",
      ratings,
      summary: summary.trim(),
      sharedAt: null,
    };
    onSave(ev);
    onClose();
  };

  const reportName = (id: string) =>
    reports.find((r) => r.employeeId === id)?.displayName ?? id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isViewOnly ? "View evaluation" : initial ? "Edit evaluation" : "New evaluation"}
          </DialogTitle>
          <DialogDescription>
            {isViewOnly
              ? "This evaluation has been shared and is now read-only."
              : "Rate competencies and add a written summary."}
          </DialogDescription>
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
          <FormField label="Review period" htmlFor="ev-period">
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm">{period}</p>
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

          {/* Ratings */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[color:var(--text-primary)]">Competency ratings</p>
            {ratings.map((r) => (
              <div key={r.competency} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-[color:var(--text-secondary)]">
                    {r.competency}
                  </label>
                  <span className="w-5 text-right text-sm font-bold text-[color:var(--text-primary)]">
                    {r.score}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[r.score]}
                  onValueChange={([v]) => updateRating(r.competency, v)}
                  disabled={isViewOnly}
                />
                <div className="flex justify-between text-[10px] text-[color:var(--text-quaternary)]">
                  <span>1 · Needs improvement</span>
                  <span>5 · Exceptional</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <FormField label="Summary" htmlFor="ev-summary" error={errors.summary} required>
            {isViewOnly ? (
              <p className="rounded-lg border border-[color:var(--border-primary)] px-3 py-2 text-sm leading-relaxed">
                {summary}
              </p>
            ) : (
              <Textarea
                id="ev-summary"
                placeholder="Written summary of performance…"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className={errors.summary ? "border-[#D92D20]" : undefined}
              />
            )}
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

  const { evals, loading, error, reload, save } = useEvaluations(supervisorId);
  const reports = useDirectReports(supervisorId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

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
    const updated: Evaluation = { ...ev, status: "SHARED", sharedAt };
    save(updated);

    // Create acknowledgement record if not already present
    const acks = readCollection<Acknowledgement>("acknowledgements");
    const exists = acks.some((a) => a.evaluationId === sharingId);
    if (!exists) {
      writeCollection("acknowledgements", [
        ...acks,
        { id: uid(), evaluationId: sharingId, employeeId: ev.employeeId, acknowledgedAt: null, deemedAt: null },
      ]);
    }

    setSharingId(null);
    toast.success("Evaluation shared with the employee.");
  };

  const columns: Column<Evaluation>[] = [
    {
      header: "Employee",
      cell: (ev) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {reportName(ev.employeeId)}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{ev.period}</p>
        </div>
      ),
    },
    {
      header: "Ratings",
      cell: (ev) => (
        <div className="flex gap-2">
          {ev.ratings.map((r) => (
            <div key={r.competency} className="text-center">
              <div className="text-xs font-bold text-[color:var(--text-primary)]">{r.score}</div>
              <div className="text-[10px] text-[color:var(--text-quaternary)]">{r.competency.slice(0, 3)}</div>
            </div>
          ))}
        </div>
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
                onClick={(e) => { e.stopPropagation(); setSharingId(ev.id); }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
                aria-label="Share evaluation"
              >
                <Send size={12} /> Share
              </button>
            </>
          )}
          {(ev.status === "SHARED" || ev.status === "ACKNOWLEDGED") && (
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

  const pending = evals.filter((e) => e.status === "DRAFT").length;

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
          <div className="rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-2.5" style={{ boxShadow: "var(--shadow-xs)" }}>
            <p className="text-xs text-[color:var(--text-tertiary)]">Total</p>
            <p className="text-lg font-bold text-[color:var(--text-primary)]">{evals.length}</p>
          </div>
          <div
            className="rounded-xl border border-[color:var(--border-primary)] px-4 py-2.5"
            style={{
              boxShadow: "var(--shadow-xs)",
              background: pending > 0 ? "var(--bg-secondary)" : "white",
            }}
          >
            <p className="text-xs text-[color:var(--text-tertiary)]">Drafts pending</p>
            <p className="text-lg font-bold text-[color:var(--text-primary)]">{pending}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-[color:var(--border-primary)] bg-white px-4 py-3">
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
              Once shared, the evaluation becomes visible to the employee and cannot be edited.
              This action cannot be undone.
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
    </div>
  );
}
