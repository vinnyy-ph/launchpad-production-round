"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  EmptyState,
  FilterBar,
  StatusBadge,
  type Column,
} from "@/shared/ui";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { OffboardingCase, DemoEmployee, Team, Clearance } from "@/shared/mock/types";

type OffboardingStatus = OffboardingCase["status"];

// ─── data hook ────────────────────────────────────────────────────────────────

interface UseOffboardingRowsResult {
  rows: CaseRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useOffboardingRows(): UseOffboardingRowsResult {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const cases = readCollection<OffboardingCase>("offboardingCases");
      const employees = readCollection<DemoEmployee>("employees");
      setRows(buildRows(cases, employees));
    } catch {
      setError("Could not load offboarding cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OffboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "INITIATED", label: "Initiated" },
  { value: "CLEARANCES", label: "Clearances" },
  { value: "COMPLETE", label: "Complete" },
];

interface CaseRow {
  id: string;
  employeeId: string;
  displayName: string;
  email: string;
  status: OffboardingStatus;
  lastDay: string;
  reason: string;
  clearanceSigned: number;
  clearanceTotal: number;
}

function buildRows(
  cases: OffboardingCase[],
  employees: DemoEmployee[],
): CaseRow[] {
  const empMap = new Map(employees.map((e) => [e.employeeId, e]));
  return cases.map((c) => {
    const emp = empMap.get(c.employeeId);
    const signed = c.clearances.filter((cl) => cl.status === "SIGNED").length;
    return {
      id: c.id,
      employeeId: c.employeeId,
      displayName: emp?.displayName ?? c.employeeId,
      email: emp?.email ?? "—",
      status: c.status,
      lastDay: c.lastDay,
      reason: c.reason,
      clearanceSigned: signed,
      clearanceTotal: c.clearances.length,
    };
  });
}

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

export default function OffboardingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | OffboardingStatus>(ALL);
  const [initiateOpen, setInitiateOpen] = useState(false);
  const { rows, loading, error, reload } = useOffboardingRows();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
      const matchesSearch =
        !q ||
        r.displayName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const hasFilters = Boolean(search.trim() || statusFilter !== ALL);

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {r.displayName}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{r.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Last Day",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.lastDay)}</span>
      ),
    },
    {
      header: "Reason",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{r.reason}</span>
      ),
    },
    {
      header: "Clearances",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {r.clearanceSigned}/{r.clearanceTotal} signed
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Offboarding"
        subtitle="Track and manage employee offboarding clearances."
        action={
          <Button onClick={() => setInitiateOpen(true)}>
            <Plus aria-hidden="true" />
            Initiate offboarding
          </Button>
        }
      />

      <InitiateOffboardingDialog
        open={initiateOpen}
        onOpenChange={setInitiateOpen}
        existingCases={rows}
        onInitiated={(caseId) => {
          reload();
          router.push(`/hr/offboarding/${caseId}`);
        }}
      />

      <FilterBar aria-label="Filter offboarding cases">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search employees"
          className="sm:max-w-[320px]"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof ALL | OffboardingStatus)}
        >
          <SelectTrigger className="sm:w-[200px]" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <DataTable
          columns={columns}
          data={filtered}
          isLoading={loading}
          error={error}
          onRetry={reload}
          emptyState={
            <EmptyState
              icon={LogOut}
              title={hasFilters ? "No matching cases" : "No offboarding cases"}
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Initiate offboarding to start a clearance process."
              }
              action={hasFilters ? undefined : { label: "Initiate offboarding", onClick: () => setInitiateOpen(true) }}
            />
          }
          onRowClick={(r) => router.push(`/hr/offboarding/${r.id}`)}
          getRowId={(r) => r.id}
        />
      </div>
    </div>
  );
}

// ─── initiate offboarding dialog ──────────────────────────────────────────────

const REASONS = ["Resignation", "End of contract", "Retirement", "Termination", "Other"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default clearance signatories: supervisor (IT), HR (People), Finance. */
function defaultClearances(emp: DemoEmployee, employees: DemoEmployee[]): Clearance[] {
  const hr = employees.find((e) => e.role === "HR" && e.isActive);
  const finance = employees.find((e) => e.department === "Finance" && e.isSupervisor);
  const list: Clearance[] = [];
  if (emp.supervisorId) list.push({ dept: "IT", ownerEmployeeId: emp.supervisorId, status: "PENDING" });
  if (finance) list.push({ dept: "Finance", ownerEmployeeId: finance.employeeId, status: "PENDING" });
  if (hr) list.push({ dept: "People", ownerEmployeeId: hr.employeeId, status: "PENDING" });
  // Always have at least one signatory.
  if (list.length === 0 && hr) list.push({ dept: "People", ownerEmployeeId: hr.employeeId, status: "PENDING" });
  return list;
}

function InitiateOffboardingDialog({
  open,
  onOpenChange,
  existingCases,
  onInitiated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCases: CaseRow[];
  onInitiated: (caseId: string) => void;
}) {
  const employees = useMemo(() => readCollection<DemoEmployee>("employees"), [open]);
  const teams = useMemo(() => readCollection<Team>("teams"), [open]);

  const activeEmployees = useMemo(() => {
    const offboarding = new Set(existingCases.map((c) => c.employeeId));
    return employees.filter((e) => e.employeeStatus === "ACTIVE" && !offboarding.has(e.employeeId));
  }, [employees, existingCases]);

  const [empId, setEmpId] = useState<string>("");
  const [lastDay, setLastDay] = useState<string>("");
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [errors, setErrors] = useState<{ emp?: string; lastDay?: string; reassign?: string }>({});

  function reset() {
    setEmpId("");
    setLastDay("");
    setReason(REASONS[0]);
    setNewSupervisorId("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const selected = empId ? employees.find((e) => e.employeeId === empId) ?? null : null;
  const directReports = useMemo(
    () => (selected ? employees.filter((e) => e.supervisorId === selected.employeeId) : []),
    [selected, employees],
  );
  const ledTeams = useMemo(
    () => (selected ? teams.filter((t) => t.leadEmployeeId === selected.employeeId) : []),
    [selected, teams],
  );
  const needsReassign = directReports.length > 0 || ledTeams.length > 0;

  function handleSubmit() {
    const next: typeof errors = {};
    if (!empId) next.emp = "Select an employee.";
    if (!lastDay) next.lastDay = "Last day is required.";
    else if (lastDay < todayIso()) next.lastDay = "Last day cannot be in the past.";
    if (needsReassign && !newSupervisorId) next.reassign = "Pick who takes over reports and team leadership.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !selected) return;

    // 1) employee → OFFBOARDING
    let emps = readCollection<DemoEmployee>("employees");
    emps = emps.map((e) =>
      e.employeeId === selected.employeeId ? { ...e, employeeStatus: "OFFBOARDING" as const } : e,
    );

    // 2) reassign direct reports + team leadership (forced when the offboardee leads)
    if (needsReassign && newSupervisorId) {
      emps = emps.map((e) =>
        e.supervisorId === selected.employeeId ? { ...e, supervisorId: newSupervisorId } : e,
      );
      // mark the new supervisor as a supervisor
      emps = emps.map((e) => (e.employeeId === newSupervisorId ? { ...e, isSupervisor: true } : e));
      if (ledTeams.length > 0) {
        const current = readCollection<Team>("teams");
        writeCollection<Team>(
          "teams",
          current.map((t) => (t.leadEmployeeId === selected.employeeId ? { ...t, leadEmployeeId: newSupervisorId } : t)),
        );
      }
    }
    writeCollection<DemoEmployee>("employees", emps);

    // 3) create the offboarding case with default clearances
    const cases = readCollection<OffboardingCase>("offboardingCases");
    const id = `of-${Date.now().toString(36)}`;
    const created: OffboardingCase = {
      id,
      employeeId: selected.employeeId,
      status: "INITIATED",
      lastDay,
      reason,
      clearances: defaultClearances(selected, emps),
    };
    writeCollection<OffboardingCase>("offboardingCases", [...cases, created]);
    toast.success(`Offboarding initiated for ${selected.displayName}.`);
    reset();
    onOpenChange(false);
    onInitiated(id);
  }

  const empOptions = activeEmployees.map((e) => ({ value: e.employeeId, label: `${e.displayName} · ${e.jobTitle}` }));
  const reassignOptions = employees
    .filter((e) => e.employeeStatus === "ACTIVE" && e.employeeId !== empId)
    .map((e) => ({ value: e.employeeId, label: `${e.displayName} · ${e.jobTitle}` }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate offboarding</DialogTitle>
          <DialogDescription>Set the last day and reason, then run the clearance process.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Employee" required error={errors.emp}>
            <Combobox
              options={empOptions}
              value={empId}
              onChange={(v) => setEmpId(v)}
              placeholder="Select an active employee…"
              searchPlaceholder="Search employees…"
              emptyText="No active employees available."
            />
          </FormField>

          <FormField label="Last day" htmlFor="off-lastday" required error={errors.lastDay}>
            <Input
              id="off-lastday"
              type="date"
              min={todayIso()}
              value={lastDay}
              onChange={(e) => setLastDay(e.target.value)}
            />
          </FormField>

          <FormField label="Reason" htmlFor="off-reason">
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="off-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {needsReassign && (
            <div className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B54708]" aria-hidden="true" />
                <p className="text-xs text-[#B54708]">
                  This employee {directReports.length > 0 ? `has ${directReports.length} direct report(s)` : ""}
                  {directReports.length > 0 && ledTeams.length > 0 ? " and " : ""}
                  {ledTeams.length > 0 ? `leads ${ledTeams.length} team(s)` : ""}. Reassign before offboarding.
                </p>
              </div>
              <div className="mt-3">
                <FormField label="Reassign reports & team leadership to" required error={errors.reassign}>
                  <Combobox
                    options={reassignOptions}
                    value={newSupervisorId}
                    onChange={(v) => setNewSupervisorId(v)}
                    placeholder="Select a new supervisor…"
                    searchPlaceholder="Search employees…"
                    emptyText="No employees available."
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Initiate offboarding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
