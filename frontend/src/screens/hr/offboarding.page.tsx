"use client";

import { useState, useMemo } from "react";
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
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useOffboardings, useCreateOffboarding } from "@/modules/people/offboarding";
import type { OffboardingListItem, OffboardingStatus } from "@/modules/people/offboarding";

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OffboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function fullName(e: { firstName: string; lastName: string }): string {
  return `${e.firstName} ${e.lastName}`.trim();
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
  const { offboardings, loading, error, reload } = useOffboardings();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offboardings.filter((r) => {
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
      const matchesSearch = !q || fullName(r.employee).toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [offboardings, search, statusFilter]);

  const hasFilters = Boolean(search.trim() || statusFilter !== ALL);

  const columns: Column<OffboardingListItem>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {fullName(r.employee)}
          </p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">
            {r.employee.jobTitle ?? "—"}
            {r.employee.department ? ` · ${r.employee.department}` : ""}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: "Tender date",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.tenderDate)}</span>
      ),
    },
    {
      header: "Effective date",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.effectiveDate)}</span>
      ),
    },
    {
      header: "Clearances",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">
          {r.signedCount}/{r.totalCount} signed
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
        existing={offboardings}
        onInitiated={(caseId) => router.push(`/hr/offboarding/${caseId}`)}
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function InitiateOffboardingDialog({
  open,
  onOpenChange,
  existing,
  onInitiated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: OffboardingListItem[];
  onInitiated: (caseId: string) => void;
}) {
  // Only fetch employees while the dialog is open.
  const { employees, loading: employeesLoading } = useEmployees(
    open ? { status: "active", limit: 200 } : {},
  );
  const { create, creating } = useCreateOffboarding();

  const [empId, setEmpId] = useState<string>("");
  const [tenderDate, setTenderDate] = useState<string>(todayIso());
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [newSupervisorId, setNewSupervisorId] = useState<string>("");
  const [errors, setErrors] = useState<{ emp?: string; effective?: string }>({});

  function reset() {
    setEmpId("");
    setTenderDate(todayIso());
    setEffectiveDate("");
    setNewSupervisorId("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  // Exclude employees that already have an active offboarding case.
  const offboardingIds = useMemo(
    () => new Set(existing.filter((c) => c.status === "IN_PROGRESS").map((c) => c.employee.id)),
    [existing],
  );

  const selectableEmployees = useMemo(
    () => employees.filter((e) => !offboardingIds.has(e.id)),
    [employees, offboardingIds],
  );

  const empOptions = selectableEmployees.map((e) => ({
    value: e.id,
    label: `${e.fullName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}`,
  }));

  const reassignOptions = employees
    .filter((e) => e.id !== empId)
    .map((e) => ({ value: e.id, label: `${e.fullName}${e.jobTitle ? ` · ${e.jobTitle}` : ""}` }));

  async function handleSubmit() {
    const next: typeof errors = {};
    if (!empId) next.emp = "Select an employee.";
    if (!effectiveDate) next.effective = "Effective date is required.";
    else if (effectiveDate < tenderDate) next.effective = "Effective date cannot be before the tender date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const selected = employees.find((e) => e.id === empId);
    try {
      const created = await create({
        employeeId: empId,
        tenderDate,
        effectiveDate,
        ...(newSupervisorId ? { newSupervisorId } : {}),
      });
      toast.success(`Offboarding initiated for ${selected?.fullName ?? "employee"}.`);
      reset();
      onOpenChange(false);
      onInitiated(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not initiate offboarding.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate offboarding</DialogTitle>
          <DialogDescription>Set the tender and effective dates, then run the clearance process.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Employee" required error={errors.emp}>
            <Combobox
              options={empOptions}
              value={empId}
              onChange={(v) => setEmpId(v)}
              placeholder={employeesLoading ? "Loading employees…" : "Select an active employee…"}
              searchPlaceholder="Search employees…"
              emptyText="No active employees available."
            />
          </FormField>

          <FormField label="Tender date" htmlFor="off-tender">
            <Input
              id="off-tender"
              type="date"
              value={tenderDate}
              onChange={(e) => setTenderDate(e.target.value)}
            />
          </FormField>

          <FormField label="Effective date" htmlFor="off-effective" required error={errors.effective}>
            <Input
              id="off-effective"
              type="date"
              min={tenderDate || todayIso()}
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </FormField>

          <div className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#B54708]" aria-hidden="true" />
              <p className="text-xs text-[#B54708]">
                If this employee has direct reports or leads teams, pick who takes over.
                Otherwise leave this blank.
              </p>
            </div>
            <div className="mt-3">
              <FormField label="Reassign reports & team leadership to (optional)">
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
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={creating}>
            {creating ? "Initiating…" : "Initiate offboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
