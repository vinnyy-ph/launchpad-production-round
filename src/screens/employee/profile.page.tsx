import { useState, useEffect } from "react";
import { Pencil, Check, X, AlertCircle, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/modules/auth/hooks/use-auth";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { DemoEmployee, Evaluation, Acknowledgement, EvaluationStatus } from "@/shared/mock/types";

import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { FormField } from "@/shared/ui/patterns";
import { StatusBadge } from "@/shared/ui/patterns";
import { PageSection } from "@/shared/ui/patterns";
import { PageHeader } from "@/shared/components/layout/page-header";

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Avatar + name block */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      {/* Info card */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5 space-y-4"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field row (read-only) ────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

// ─── Evaluation banner ────────────────────────────────────────────────────────

function EvalBanner({
  evaluation,
  onAcknowledge,
}: {
  evaluation: Evaluation;
  onAcknowledge: () => void;
}) {
  if (evaluation.status === "ACKNOWLEDGED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#ABEFC6] bg-[#ECFDF3] px-4 py-3">
        <Check size={16} className="flex-shrink-0 text-[#067647]" />
        <p className="flex-1 text-sm text-[#067647]">
          You have acknowledged your {evaluation.period} evaluation.
        </p>
      </div>
    );
  }

  const ratings = evaluation.ratings ?? [];
  const avgScore =
    evaluation.grade != null
      ? String(evaluation.grade)
      : ratings.length > 0
        ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
        : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 sm:flex-row sm:items-center">
      <Star size={16} className="flex-shrink-0 text-[#B54708]" />
      <div className="flex-1">
        <p className="text-sm font-medium text-[#B54708]">
          Your {evaluation.period} evaluation is ready — review and acknowledge.
        </p>
        {avgScore && (
          <p className="mt-0.5 text-xs text-[#92400e]">
            Overall score: {avgScore} / 5
          </p>
        )}
      </div>
      <Button size="sm" onClick={onAcknowledge} className="self-start sm:self-auto">
        Acknowledge
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { appUser } = useAuth();

  const [employee, setEmployee] = useState<DemoEmployee | null>(null);
  const [supervisor, setSupervisor] = useState<DemoEmployee | null>(null);
  const [myEval, setMyEval] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    try {
      if (!appUser?.employeeId) {
        setError("No employee record linked to this account.");
        return;
      }

      const employees = readCollection<DemoEmployee>("employees");
      const emp = employees.find((e) => e.employeeId === appUser.employeeId) ?? null;

      if (!emp) {
        setError("Employee record not found.");
        return;
      }

      setEmployee(emp);
      setEmailDraft(emp.email);

      if (emp.supervisorId) {
        setSupervisor(employees.find((e) => e.employeeId === emp.supervisorId) ?? null);
      }

      const evals = readCollection<Evaluation>("evaluations");
      const shared = evals.find(
        (ev) =>
          ev.employeeId === appUser.employeeId &&
          (ev.status === "SHARED" || ev.status === "ACKNOWLEDGED"),
      ) ?? null;
      setMyEval(shared);
    } catch {
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.employeeId]);

  // ── Save contact ──────────────────────────────────────────────────────────

  function saveContact() {
    if (!employee) return;
    if (!emailDraft.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    const all = readCollection<DemoEmployee>("employees");
    const updated = all.map((e) =>
      e.employeeId === employee.employeeId ? { ...e, email: emailDraft.trim() } : e,
    );
    writeCollection("employees", updated);
    setEmployee((prev) => (prev ? { ...prev, email: emailDraft.trim() } : prev));
    setEditMode(false);
    toast.success("Contact info updated");
  }

  function cancelEdit() {
    setEmailDraft(employee?.email ?? "");
    setEmailError(null);
    setEditMode(false);
  }

  // ── Acknowledge evaluation ────────────────────────────────────────────────

  function acknowledge(evalId: string) {
    const evals = readCollection<Evaluation>("evaluations");
    writeCollection(
      "evaluations",
      evals.map((e) => (e.id === evalId ? { ...e, status: "ACKNOWLEDGED" as EvaluationStatus } : e)),
    );
    const acks = readCollection<Acknowledgement>("acknowledgements");
    writeCollection(
      "acknowledgements",
      acks.map((a) =>
        a.evaluationId === evalId ? { ...a, acknowledgedAt: new Date().toISOString() } : a,
      ),
    );
    setMyEval((prev) => (prev ? { ...prev, status: "ACKNOWLEDGED" as EvaluationStatus } : prev));
    toast.success("Evaluation acknowledged");
  }

  // ── Initials helper ───────────────────────────────────────────────────────

  function initials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="My profile" />

      {/* Evaluation banner */}
      {myEval && (
        <EvalBanner evaluation={myEval} onAcknowledge={() => acknowledge(myEval.id)} />
      )}

      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-white text-lg font-bold select-none"
          style={{
            background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
          }}
          aria-hidden="true"
        >
          {initials(employee.displayName)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] leading-tight">
            {employee.displayName}
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)]">{employee.jobTitle}</p>
          <div className="mt-1">
            <StatusBadge status={employee.employeeStatus} dot />
          </div>
        </div>
      </div>

      {/* Work info */}
      <PageSection title="Work information">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label="Department" value={employee.department} />
            <FieldRow label="Job title" value={employee.jobTitle} />
            <FieldRow label="Start date" value={formatDate(employee.startDate)} />
            <FieldRow
              label="Supervisor"
              value={supervisor ? supervisor.displayName : employee.supervisorId ? "—" : "None"}
            />
            <FieldRow label="Team ID" value={employee.teamId ?? "Unassigned"} />
            <FieldRow label="Employee ID" value={employee.employeeId} />
          </div>
        </div>
      </PageSection>

      {/* Contact info (editable) */}
      <PageSection
        title="Contact information"
        action={
          !editMode ? (
            <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
              <Pencil size={14} />
              Edit contact
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={cancelEdit}>
                <X size={14} />
                Cancel
              </Button>
              <Button size="sm" onClick={saveContact}>
                <Check size={14} />
                Save
              </Button>
            </div>
          )
        }
      >
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editMode ? (
              <FormField label="Email" htmlFor="profile-email">
                <Input
                  id="profile-email"
                  type="email"
                  value={emailDraft}
                  onChange={(e) => { setEmailDraft(e.target.value); setEmailError(null); }}
                  placeholder="Enter email"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "profile-email-error" : undefined}
                />
                {emailError && (
                  <p id="profile-email-error" className="mt-1 flex items-center gap-1 text-xs text-[color:var(--color-error-500)]">
                    <AlertCircle size={12} aria-hidden="true" /> {emailError}
                  </p>
                )}
              </FormField>
            ) : (
              <FieldRow label="Email" value={employee.email} />
            )}
            {/* Phone is display-only; DemoEmployee has no phone field */}
            <FieldRow label="Phone" value="—" />
          </div>
        </div>
      </PageSection>

      {/* Evaluation summary (when one exists) */}
      {myEval && (
        <PageSection title="Evaluation summary">
          <div
            className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5 space-y-4"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)]">
                  {myEval.period}
                </p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                  {myEval.sharedAt
                    ? `Shared ${formatDate(myEval.sharedAt)}`
                    : "Pending share"}
                </p>
              </div>
              <StatusBadge status={myEval.status} />
            </div>

            {myEval.summary && (
              <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed border-t border-[color:var(--border-primary)] pt-3">
                {myEval.summary}
              </p>
            )}

            {(myEval.ratings?.length ?? 0) > 0 && (
              <div className="space-y-2 border-t border-[color:var(--border-primary)] pt-3">
                <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wide">
                  Competency ratings
                </p>
                {(myEval.ratings ?? []).map((r) => (
                  <div key={r.competency} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[color:var(--text-secondary)]">
                      {r.competency}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={13}
                          className={
                            n <= r.score
                              ? "fill-[#F79009] text-[#F79009]"
                              : "fill-none text-[color:var(--border-primary)]"
                          }
                        />
                      ))}
                      <span className="ml-1 text-xs font-medium text-[color:var(--text-tertiary)]">
                        {r.score}/5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PageSection>
      )}
    </div>
  );
}
