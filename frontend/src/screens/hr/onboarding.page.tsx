"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
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
  Progress,
} from "@/shared/ui";
import { DataTable, EmptyState, FilterBar, StatusBadge, type Column } from "@/shared/ui/patterns";
import { useOnboardingRecords } from "@/modules/people/onboarding/hooks/use-onboarding-records";
import { useOnboardEmployee } from "@/modules/people/onboarding/hooks/use-onboard-employee";
import type { DocumentReview } from "@/modules/people/onboarding/types/onboarding.types";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";

// ─── row shape derived from the employees + document-reviews feeds ────────────

interface CaseRow {
  employeeId: string;
  name: string;
  email: string;
  status: string; // employee lifecycle status (onboarding/active/…)
  progress: number; // derived from approved document submissions
  invitationStatus: string | null;
}

const ALL = "ALL";

// Invitation lifecycle drives the displayed status filter (employee rows are all "onboarding").
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "pending", label: "Invited" },
  { value: "accepted", label: "In progress" },
  { value: "expired", label: "Expired" },
  { value: "failed_delivery", label: "Delivery failed" },
];

/** Coarse progress for an employee: share of their document submissions that are approved. */
function deriveProgress(employeeId: string, reviews: DocumentReview[]): number {
  const mine = reviews.filter((r) => r.employee.id === employeeId);
  if (mine.length === 0) return 0;
  const approved = mine.filter((r) => r.status === "approved").length;
  return Math.round((approved / mine.length) * 100);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [startOpen, setStartOpen] = useState(false);
  const { employees, reviews, loading, error, reload } = useOnboardingRecords();

  const rows = useMemo<CaseRow[]>(
    () =>
      employees.map((e) => ({
        employeeId: e.id,
        name: e.fullName,
        email: e.companyEmail,
        status: e.status,
        progress: deriveProgress(e.id, reviews),
        invitationStatus: null,
      })),
    [employees, reviews],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === ALL || r.invitationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const hasFilters = Boolean(search || statusFilter !== ALL);

  const columns: Column<CaseRow>[] = [
    {
      header: "Employee",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{r.name}</p>
          <p className="truncate text-xs text-[color:var(--text-tertiary)]">{r.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} dot />,
    },
    {
      header: "Documents",
      cell: (r) => (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={r.progress} className="flex-1" />
          <span className="w-8 text-right text-xs text-[color:var(--text-tertiary)]">
            {r.progress}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        level="page"
        title="Onboarding"
        subtitle="Track and manage employee onboarding cases."
        action={
          <Button onClick={() => setStartOpen(true)}>
            <Plus aria-hidden="true" />
            Start onboarding
          </Button>
        }
      />

      <StartOnboardingDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onStarted={(employeeId) => {
          reload();
          router.push(`/hr/onboarding/${employeeId}`);
        }}
      />

      <FilterBar aria-label="Filter onboarding cases">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search onboarding cases"
          className="sm:max-w-[320px]"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
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
              icon={ClipboardList}
              title={hasFilters ? "No matching cases" : "No onboarding cases yet"}
              body={hasFilters ? "Try a different search or filter." : "Start onboarding to invite a new hire."}
              action={hasFilters ? undefined : { label: "Start onboarding", onClick: () => setStartOpen(true) }}
            />
          }
          onRowClick={(r) => router.push(`/hr/onboarding/${r.employeeId}`)}
          getRowId={(r) => r.employeeId}
        />
      </div>
    </div>
  );
}

// ─── start onboarding dialog ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function StartOnboardingDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (employeeId: string) => void;
}) {
  // Active employees are the valid supervisor candidates.
  const { employees: activeEmployees } = useEmployees({ status: "active", limit: 100 });
  const onboard = useOnboardEmployee();

  const [companyEmail, setCompanyEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [errors, setErrors] = useState<{
    companyEmail?: string;
    jobTitle?: string;
    department?: string;
    supervisorId?: string;
  }>({});

  function reset() {
    setCompanyEmail("");
    setFirstName("");
    setLastName("");
    setJobTitle("");
    setDepartment("");
    setSupervisorId("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(companyEmail.trim())) next.companyEmail = "Enter a valid email address.";
    if (!jobTitle.trim()) next.jobTitle = "Job title is required.";
    if (!department.trim()) next.department = "Department is required.";
    if (!supervisorId) next.supervisorId = "Select a supervisor.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onboard.mutate(
      {
        companyEmail: companyEmail.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        supervisorId,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          toast.success(`Onboarding started for ${result.employee.companyEmail}.`);
          reset();
          onOpenChange(false);
          onStarted(result.employee.id);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Could not start onboarding.");
        },
      },
    );
  }

  const supervisorOptions = activeEmployees.map((e) => ({
    value: e.id,
    label: `${e.fullName} · ${e.companyEmail}`,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start onboarding</DialogTitle>
          <DialogDescription>
            Create a new hire and send their onboarding invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Work email" htmlFor="ob-email" required error={errors.companyEmail}>
            <Input
              id="ob-email"
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="name@managejia.demo"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" htmlFor="ob-first">
              <Input
                id="ob-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jordan"
              />
            </FormField>
            <FormField label="Last name" htmlFor="ob-last">
              <Input
                id="ob-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Park"
              />
            </FormField>
          </div>
          <FormField label="Job title" htmlFor="ob-title" required error={errors.jobTitle}>
            <Input
              id="ob-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Nurse"
            />
          </FormField>
          <FormField label="Department" htmlFor="ob-dept" required error={errors.department}>
            <Input
              id="ob-dept"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Patient Care"
            />
          </FormField>
          <FormField label="Supervisor" required error={errors.supervisorId}>
            <Combobox
              options={supervisorOptions}
              value={supervisorId}
              onChange={(v) => setSupervisorId(v || "")}
              placeholder="Select a supervisor…"
              searchPlaceholder="Search employees…"
              emptyText="No active employees found."
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={onboard.isPending}>
            {onboard.isPending ? "Starting…" : "Start onboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
