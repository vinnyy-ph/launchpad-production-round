"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Input,
  Progress,
  Separator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { EmptyState, ErrorState, StatusBadge, ConfirmProvider, useConfirm } from "@/shared/ui/patterns";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type {
  OnboardingCase,
  DemoEmployee,
  OnboardingDocument,
  DocStatus,
  UserAccount,
} from "@/shared/mock/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function allDocsApproved(docs: OnboardingDocument[]): boolean {
  return docs.length > 0 && docs.every((d) => d.status === "APPROVED");
}

function allFieldsFilled(fields: { label: string; value: string }[]): boolean {
  return fields.length > 0 && fields.every((f) => f.value.trim() !== "" && f.value.trim() !== "—");
}

function DocStatusIcon({ status }: { status: DocStatus }) {
  if (status === "APPROVED")
    return <CheckCircle2 className="h-4 w-4 text-[#067647]" aria-label="Approved" />;
  if (status === "REJECTED")
    return <XCircle className="h-4 w-4 text-[#B42318]" aria-label="Rejected" />;
  return <Clock className="h-4 w-4 text-[color:var(--text-quaternary)]" aria-label="Pending" />;
}

// ─── bulk .xlsx import ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRow {
  rowNo: number;
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

/** Pull the first non-empty value for any of the given header aliases. */
function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) {
      const v = row[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

function validateRows(rows: Record<string, unknown>[], existingEmails: Set<string>): ParsedRow[] {
  const seen = new Set<string>();
  return rows.map((raw, i) => {
    const name = pick(raw, ["name", "full name", "displayname", "employee"]);
    const email = pick(raw, ["email", "e-mail", "email address"]);
    const rowNo = i + 2; // header is row 1
    let error: string | undefined;
    if (!name) error = "Missing name.";
    else if (!email) error = "Missing email.";
    else if (!EMAIL_RE.test(email)) error = "Invalid email.";
    else if (existingEmails.has(email.toLowerCase()) || seen.has(email.toLowerCase()))
      error = "Duplicate email.";
    if (email) seen.add(email.toLowerCase());
    return { rowNo, name, email, valid: !error, error };
  });
}

// ─── page ───────────────────────────────────────────────────────────────────

function OnboardingDetailInner() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // bulk import preview state
  const [bulkRows, setBulkRows] = useState<ParsedRow[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    try {
      const cases = readCollection<OnboardingCase>("onboardingCases");
      setOnboardingCase(cases.find((c) => c.id === id) ?? null);
    } catch {
      setLoadError("Could not load onboarding case.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const employee = useMemo<DemoEmployee | null>(() => {
    if (!onboardingCase) return null;
    const employees = readCollection<DemoEmployee>("employees");
    return employees.find((e) => e.employeeId === onboardingCase.employeeId) ?? null;
  }, [onboardingCase]);

  // ── auto-complete check ──────────────────────────────────────────────────
  function maybeComplete(updated: OnboardingCase): OnboardingCase {
    if (
      updated.status !== "COMPLETE" &&
      allDocsApproved(updated.documents) &&
      allFieldsFilled(updated.customFields)
    ) {
      // promote employee to ACTIVE
      const employees = readCollection<DemoEmployee>("employees");
      const updatedEmployees = employees.map((e) =>
        e.employeeId === updated.employeeId ? { ...e, employeeStatus: "ACTIVE" as const } : e,
      );
      writeCollection<DemoEmployee>("employees", updatedEmployees);

      toast.success("Onboarding complete — employee is now Active.");
      return { ...updated, status: "COMPLETE", progress: 100 };
    }
    return updated;
  }

  // ── persist helper ───────────────────────────────────────────────────────
  function persist(updated: OnboardingCase) {
    const checked = maybeComplete(updated);
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const next = cases.map((c) => (c.id === checked.id ? checked : c));
    writeCollection<OnboardingCase>("onboardingCases", next);
    setOnboardingCase(checked);
  }

  // ── document actions ─────────────────────────────────────────────────────
  async function handleDocAction(docName: string, action: "APPROVED" | "REJECTED") {
    if (!onboardingCase) return;
    const isApprove = action === "APPROVED";
    const ok = await confirm({
      title: isApprove ? `Approve "${docName}"?` : `Reject "${docName}"?`,
      description: isApprove
        ? "Approving all documents may automatically mark the employee as Active."
        : "Rejection will require the employee to resubmit this document.",
      confirmLabel: isApprove ? "Approve" : "Reject",
      cancelLabel: "Cancel",
      destructive: !isApprove,
    });
    if (!ok) return;
    const updatedDocs = onboardingCase.documents.map((d) =>
      d.name === docName ? { ...d, status: action as DocStatus } : d,
    );
    const label = isApprove ? "approved" : "rejected";
    toast.success(`"${docName}" ${label}.`);
    persist({ ...onboardingCase, documents: updatedDocs });
  }

  // ── custom field edit ────────────────────────────────────────────────────
  function handleFieldChange(idx: number, value: string) {
    if (!onboardingCase) return;
    const updatedFields = onboardingCase.customFields.map((f, i) =>
      i === idx ? { ...f, value } : f,
    );
    const updated = { ...onboardingCase, customFields: updatedFields };
    persist(updated);
  }

  // ── send invite ──────────────────────────────────────────────────────────
  function handleSendInvite() {
    if (!onboardingCase) return;
    const updated = { ...onboardingCase, invitedAt: new Date().toISOString() };
    persist(updated);
    toast.success("Invitation sent.");
  }

  // ── bulk upload (.xlsx) ────────────────────────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setBulkError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (json.length === 0) {
        setBulkError("The spreadsheet has no data rows.");
        setBulkRows([]);
        return;
      }
      const existingEmails = new Set(
        readCollection<DemoEmployee>("employees").map((emp) => emp.email.toLowerCase()),
      );
      setBulkRows(validateRows(json, existingEmails));
    } catch {
      setBulkError("Could not read the file. Make sure it is a valid .xlsx spreadsheet.");
      setBulkRows([]);
    }
  }

  // Commit only the valid rows: create employee + user + onboarding case for each.
  function commitBulk() {
    if (!bulkRows) return;
    const valid = bulkRows.filter((r) => r.valid);
    if (valid.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    const employees = readCollection<DemoEmployee>("employees");
    const users = readCollection<UserAccount>("users");
    const cases = readCollection<OnboardingCase>("onboardingCases");

    const newEmployees: DemoEmployee[] = [];
    const newUsers: UserAccount[] = [];
    const newCases: OnboardingCase[] = [];
    const nowIso = new Date().toISOString();

    valid.forEach((r, idx) => {
      const stamp = `${Date.now().toString(36)}${idx}`;
      const employeeId = `e-${stamp}`;
      const userId = `u-${stamp}`;
      newEmployees.push({
        employeeId,
        userId,
        displayName: r.name,
        email: r.email,
        role: "EMPLOYEE",
        isSupervisor: false,
        isActive: true,
        jobTitle: "New hire",
        department: "Unassigned",
        employeeStatus: "ONBOARDING",
        supervisorId: null,
        teamId: null,
        startDate: nowIso.slice(0, 10),
      });
      newUsers.push({ id: userId, employeeId, email: r.email, role: "EMPLOYEE", isActive: true, lastActiveAt: nowIso });
      newCases.push({
        id: `ob-${stamp}`,
        employeeId,
        status: "INVITED",
        progress: 0,
        customFields: [
          { label: "T-shirt size", value: "" },
          { label: "Emergency contact", value: "" },
          { label: "Equipment", value: "" },
        ],
        documents: [
          { name: "Signed contract", status: "PENDING" },
          { name: "Government ID", status: "PENDING" },
          { name: "Tax form", status: "PENDING" },
        ],
        invitedAt: nowIso,
      });
    });

    writeCollection<DemoEmployee>("employees", [...employees, ...newEmployees]);
    writeCollection<UserAccount>("users", [...users, ...newUsers]);
    writeCollection<OnboardingCase>("onboardingCases", [...cases, ...newCases]);

    toast.success(`Imported ${valid.length} of ${bulkRows.length} rows.`);
    setBulkRows(null);
  }

  // ─── render guards ──────────────────────────────────────────────────────

  if (loading) return null;

  if (loadError) {
    return (
      <div className="p-4">
        <ErrorState message={loadError} onRetry={load} />
      </div>
    );
  }

  // Not found
  if (onboardingCase === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <EmptyState
          icon={ClipboardList}
          title="Case not found"
          body="This onboarding case does not exist or has been removed."
          action={{ label: "Back to Onboarding", onClick: () => router.push("/hr/onboarding") }}
        />
      </div>
    );
  }

  const { status, progress, customFields, documents, invitedAt } = onboardingCase;
  const employeeName = employee?.displayName ?? "Unknown Employee";
  const canSendInvite = status === "INVITED" || status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-[color:var(--text-tertiary)]" aria-label="Breadcrumb">
        <button
          onClick={() => router.push("/hr/onboarding")}
          className="hover:text-[color:var(--text-primary)] transition-colors"
        >
          HR
        </button>
        <span className="mx-1">›</span>
        <button
          onClick={() => router.push("/hr/onboarding")}
          className="hover:text-[color:var(--text-primary)] transition-colors"
        >
          Onboarding
        </button>
        <span className="mx-1">›</span>
        <span className="text-[color:var(--text-secondary)]">{employeeName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <PageHeader
            level="page"
            title={employeeName}
            subtitle={`Invited ${formatDate(invitedAt)}`}
          />
          <div className="flex items-center gap-3 -mt-4">
            <StatusBadge status={status} dot />
            <div className="flex flex-1 max-w-[240px] items-center gap-2">
              <Progress value={progress} className="flex-1" />
              <span className="text-xs text-[color:var(--text-tertiary)]">{progress}%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {canSendInvite && (
            <Button variant="outline" onClick={handleSendInvite}>
              Send invite
            </Button>
          )}
          {/* Bulk upload */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload .xlsx
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            aria-label="Upload .xlsx file"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* Custom Fields */}
      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Custom fields"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Custom Fields
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          {customFields.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No custom fields defined.
            </p>
          ) : (
            customFields.map((field, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 px-6 py-4 sm:flex-row sm:items-center sm:gap-4"
              >
                <label
                  htmlFor={`field-${idx}`}
                  className="w-full text-xs font-medium text-[color:var(--text-secondary)] sm:w-40 sm:flex-shrink-0"
                >
                  {field.label}
                </label>
                <Input
                  id={`field-${idx}`}
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, e.target.value)}
                  className="flex-1"
                  disabled={status === "COMPLETE"}
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Documents */}
      <section
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
        aria-label="Documents"
      >
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Documents
          </h2>
        </div>
        <Separator />
        <div className="divide-y divide-[color:var(--border-primary)]">
          {documents.length === 0 ? (
            <p className="px-6 py-4 text-sm text-[color:var(--text-tertiary)]">
              No documents requested.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.name}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <DocStatusIcon status={doc.status} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">
                      {doc.name}
                    </p>
                    <StatusBadge status={doc.status} shape="pill" />
                  </div>
                </div>

                {/* HR approve / reject actions — only for SUBMITTED docs */}
                {doc.status !== "APPROVED" && doc.status !== "REJECTED" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#067647] border-[#ABEFC6] hover:bg-[#ECFDF3]"
                      onClick={() => void handleDocAction(doc.name, "APPROVED")}
                      disabled={doc.status === "PENDING"}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#B42318] border-[#FECDCA] hover:bg-[#FEF3F2]"
                      onClick={() => void handleDocAction(doc.name, "REJECTED")}
                      disabled={doc.status === "PENDING"}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {/* Already decided */}
                {doc.status === "APPROVED" && (
                  <span className="text-xs font-medium text-[#067647]">Approved</span>
                )}
                {doc.status === "REJECTED" && (
                  <span className="text-xs font-medium text-[#B42318]">Rejected</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Bulk import preview dialog */}
      <BulkImportDialog
        rows={bulkRows}
        error={bulkError}
        onClose={() => { setBulkRows(null); setBulkError(null); }}
        onCommit={commitBulk}
      />
    </div>
  );
}

// ─── bulk import dialog ────────────────────────────────────────────────────────

function BulkImportDialog({
  rows,
  error,
  onClose,
  onCommit,
}: {
  rows: ParsedRow[] | null;
  error: string | null;
  onClose: () => void;
  onCommit: () => void;
}) {
  const open = rows !== null;
  const validCount = rows?.filter((r) => r.valid).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk import preview</DialogTitle>
          <DialogDescription>
            {error
              ? "We could not import this file."
              : `${validCount} of ${rows?.length ?? 0} row(s) are valid. Only valid rows will be imported.`}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] p-3 text-sm text-[#B42318]">
            <XCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {error}
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-[color:var(--border-primary)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#FAFAFA]">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-primary)]">
                {(rows ?? []).map((r) => (
                  <tr key={r.rowNo}>
                    <td className="px-3 py-2 text-[color:var(--text-tertiary)]">{r.rowNo}</td>
                    <td className="px-3 py-2 text-[color:var(--text-primary)]">{r.name || "—"}</td>
                    <td className="px-3 py-2 text-[color:var(--text-secondary)]">{r.email || "—"}</td>
                    <td className="px-3 py-2">
                      {r.valid ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#067647]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B42318]">
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> {r.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onCommit} disabled={!!error || validCount === 0}>
            Import {validCount} valid row{validCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── page export (wraps with ConfirmProvider) ─────────────────────────────────

export default function OnboardingDetailPage() {
  return (
    <ConfirmProvider>
      <OnboardingDetailInner />
    </ConfirmProvider>
  );
}
