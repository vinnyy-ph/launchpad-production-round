"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { OnboardingCase, DemoEmployee, OnboardingStatus, UserAccount } from "@/shared/mock/types";

// ─── data hook ───────────────────────────────────────────────────────────────

interface UseOnboardingRowsResult {
  rows: CaseRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useOnboardingRows(): UseOnboardingRowsResult {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const cases = readCollection<OnboardingCase>("onboardingCases");
      const employees = readCollection<DemoEmployee>("employees");
      const empMap = new Map(employees.map((e) => [e.employeeId, e]));
      const built = cases.map((c) => {
        const emp = empMap.get(c.employeeId);
        return {
          caseId: c.id,
          employeeId: c.employeeId,
          name: emp?.displayName ?? "Unknown",
          email: emp?.email ?? "—",
          status: c.status,
          progress: c.progress,
          invitedAt: c.invitedAt,
        } satisfies CaseRow;
      });
      setRows(built);
    } catch {
      setError("Could not load onboarding cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, reload: load };
}

const ALL = "ALL";

const STATUS_OPTIONS: { value: typeof ALL | OnboardingStatus; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "INVITED", label: "Invited" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DOCS_REVIEW", label: "Docs review" },
  { value: "COMPLETE", label: "Complete" },
];

interface CaseRow {
  caseId: string;
  employeeId: string;
  name: string;
  email: string;
  status: OnboardingStatus;
  progress: number;
  invitedAt: string;
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

export default function OnboardingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof ALL | OnboardingStatus>(ALL);
  const [startOpen, setStartOpen] = useState(false);
  const { rows, loading, error, reload } = useOnboardingRows();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === ALL || r.status === statusFilter;
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
      header: "Progress",
      cell: (r) => (
        <div className="flex min-w-[120px] items-center gap-2">
          <Progress value={r.progress} className="flex-1" />
          <span className="w-8 text-right text-xs text-[color:var(--text-tertiary)]">
            {r.progress}%
          </span>
        </div>
      ),
    },
    {
      header: "Invited",
      cell: (r) => (
        <span className="text-sm text-[color:var(--text-secondary)]">{formatDate(r.invitedAt)}</span>
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
        existingCases={rows}
        onStarted={(caseId) => {
          reload();
          router.push(`/hr/onboarding/${caseId}`);
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
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as typeof ALL | OnboardingStatus)}
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
              icon={ClipboardList}
              title={hasFilters ? "No matching cases" : "No onboarding cases yet"}
              body={hasFilters ? "Try a different search or filter." : "Start onboarding to invite a new hire."}
              action={hasFilters ? undefined : { label: "Start onboarding", onClick: () => setStartOpen(true) }}
            />
          }
          onRowClick={(r) => router.push(`/hr/onboarding/${r.caseId}`)}
          getRowId={(r) => r.caseId}
        />
      </div>
    </div>
  );
}

// ─── start onboarding dialog ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEW_HIRE = "__new__";

const DEFAULT_FIELDS = [
  { label: "T-shirt size", value: "" },
  { label: "Emergency contact", value: "" },
  { label: "Equipment", value: "" },
];
const DEFAULT_DOCS: OnboardingCase["documents"] = [
  { name: "Signed contract", status: "PENDING" },
  { name: "Government ID", status: "PENDING" },
  { name: "Tax form", status: "PENDING" },
];

function StartOnboardingDialog({
  open,
  onOpenChange,
  existingCases,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCases: CaseRow[];
  onStarted: (caseId: string) => void;
}) {
  // Pick an existing ONBOARDING-status employee without a case, or create a new hire.
  const candidates = useMemo(() => {
    const employees = readCollection<DemoEmployee>("employees");
    const withCase = new Set(existingCases.map((c) => c.employeeId));
    return employees.filter((e) => e.employeeStatus === "ONBOARDING" && !withCase.has(e.employeeId));
  }, [existingCases]);

  const [pick, setPick] = useState<string>(NEW_HIRE);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  function reset() {
    setPick(NEW_HIRE);
    setName("");
    setEmail("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function newCase(employeeId: string): string {
    const cases = readCollection<OnboardingCase>("onboardingCases");
    const id = `ob-${Date.now().toString(36)}`;
    const created: OnboardingCase = {
      id,
      employeeId,
      status: "INVITED",
      progress: 0,
      customFields: DEFAULT_FIELDS.map((f) => ({ ...f })),
      documents: DEFAULT_DOCS.map((d) => ({ ...d })),
      invitedAt: new Date().toISOString(),
    };
    writeCollection<OnboardingCase>("onboardingCases", [...cases, created]);
    return id;
  }

  function handleSubmit() {
    if (pick !== NEW_HIRE) {
      const caseId = newCase(pick);
      const emp = candidates.find((c) => c.employeeId === pick);
      toast.success(`Onboarding started for ${emp?.displayName ?? "employee"}.`);
      reset();
      onOpenChange(false);
      onStarted(caseId);
      return;
    }

    // New hire path — create the employee (status ONBOARDING) + user + case.
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    const employees = readCollection<DemoEmployee>("employees");
    const users = readCollection<UserAccount>("users");
    if (!next.email && users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      next.email = "A user with this email already exists.";
    }
    setErrors(next);
    if (next.name || next.email) return;

    const stamp = Date.now().toString(36);
    const employeeId = `e-${stamp}`;
    const userId = `u-${stamp}`;
    const nowIso = new Date().toISOString();

    const newEmployee: DemoEmployee = {
      employeeId,
      userId,
      displayName: name.trim(),
      email: email.trim(),
      role: "EMPLOYEE",
      isSupervisor: false,
      isActive: true,
      jobTitle: "New hire",
      department: "Unassigned",
      employeeStatus: "ONBOARDING",
      supervisorId: null,
      teamId: null,
      startDate: nowIso.slice(0, 10),
    };
    const newUser: UserAccount = {
      id: userId,
      employeeId,
      email: email.trim(),
      role: "EMPLOYEE",
      isActive: true,
      lastActiveAt: nowIso,
    };
    writeCollection<DemoEmployee>("employees", [...employees, newEmployee]);
    writeCollection<UserAccount>("users", [...users, newUser]);

    const caseId = newCase(employeeId);
    toast.success(`Onboarding started for ${newEmployee.displayName}.`);
    reset();
    onOpenChange(false);
    onStarted(caseId);
  }

  const options = [
    { value: NEW_HIRE, label: "+ New hire (create employee)" },
    ...candidates.map((c) => ({ value: c.employeeId, label: `${c.displayName} · ${c.email}` })),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start onboarding</DialogTitle>
          <DialogDescription>
            Invite a new hire or pick an existing onboarding employee without a case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormField label="Employee">
            <Combobox
              options={options}
              value={pick}
              onChange={(v) => setPick(v || NEW_HIRE)}
              placeholder="Select…"
              searchPlaceholder="Search employees…"
              emptyText="No candidates found."
            />
          </FormField>

          {pick === NEW_HIRE && (
            <>
              <FormField label="Full name" htmlFor="ob-name" required error={errors.name}>
                <Input
                  id="ob-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Park"
                />
              </FormField>
              <FormField label="Email" htmlFor="ob-email" required error={errors.email}>
                <Input
                  id="ob-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@swiftwork.demo"
                />
              </FormField>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Start onboarding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
