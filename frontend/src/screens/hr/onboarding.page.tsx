"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Settings2, Send } from "lucide-react";
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
  Textarea,
  DatePicker,
} from "@/shared/ui";
import {
  DataTable,
  EmptyState,
  FilterBar,
  PageSkeleton,
  StatusBadge,
  type Column,
} from "@/shared/ui/patterns";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { InviteStatusBadge } from "@/modules/people/onboarding/components/invite-status-badge";
import { useOnboardingRecords } from "@/modules/people/onboarding/hooks/use-onboarding-records";
import { useOnboardEmployee } from "@/modules/people/onboarding/hooks/use-onboard-employee";
import { sendInvitation } from "@/modules/people/onboarding/services/onboarding.service";
import type {
  DocumentReview,
  OnboardingInvitationStatus,
} from "@/modules/people/onboarding/types/onboarding.types";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";

interface CaseRow {
  employeeId: string;
  name: string;
  email: string;
  status: string;
  progress: number;
  invitationStatus: OnboardingInvitationStatus | null;
}

const ALL = "ALL";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: ALL, label: "All statuses" },
  { value: "pending", label: "Invited" },
  { value: "accepted", label: "In progress" },
  { value: "expired", label: "Expired" },
  { value: "failed_delivery", label: "Delivery failed" },
];

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
  const debouncedSearch = useDebounce(search, 300);
  const { employees, reviews, invitationStatusByEmployeeId, loading, error, reload } =
    useOnboardingRecords();

  const rows = useMemo<CaseRow[]>(
    () =>
      employees.map((e) => ({
        employeeId: e.id,
        name: e.fullName,
        email: e.companyEmail,
        status: e.status,
        progress: deriveProgress(e.id, reviews),
        invitationStatus: invitationStatusByEmployeeId.get(e.id) ?? null,
      })),
    [employees, reviews, invitationStatusByEmployeeId],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesSearch =
        !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === ALL || r.invitationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, debouncedSearch, statusFilter]);

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
      header: "Invite status",
      cell: (r) => <InviteStatusBadge status={r.invitationStatus} dot />,
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

  if (loading && rows.length === 0) {
    return (
      <div>
        <PageHeader
          level="page"
          title="Onboarding"
          subtitle="Track and manage employee onboarding cases."
        />
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        level="page"
        title="Onboarding"
        subtitle="Track and manage employee onboarding cases."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push("/hr/onboarding/settings")}>
              <Settings2 aria-hidden="true" />
              Settings
            </Button>
            <Button onClick={() => setStartOpen(true)}>
              <Plus aria-hidden="true" />
              Start onboarding
            </Button>
          </div>
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
          <SelectTrigger className="sm:w-[200px]" aria-label="Filter by invite status">
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
              body={
                hasFilters
                  ? "Try a different search or filter."
                  : "Start onboarding to invite a new hire."
              }
              action={
                hasFilters ? undefined : { label: "Start onboarding", onClick: () => setStartOpen(true) }
              }
            />
          }
          onRowClick={(r) => router.push(`/hr/onboarding/${r.employeeId}`)}
          getRowId={(r) => r.employeeId}
        />
      </div>
    </div>
  );
}

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
  const { employees: activeEmployees } = useEmployees({ status: "active", limit: 100 });
  const onboard = useOnboardEmployee();

  const [companyEmail, setCompanyEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState<Date | undefined>();
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [errors, setErrors] = useState<{
    companyEmail?: string;
    personalEmail?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    birthday?: string;
    address?: string;
    emergencyContact?: string;
    jobTitle?: string;
    department?: string;
    supervisorId?: string;
  }>({});
  const [isStarting, setIsStarting] = useState(false);

  function reset() {
    setCompanyEmail("");
    setPersonalEmail("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setBirthday(undefined);
    setAddress("");
    setEmergencyContact("");
    setJobTitle("");
    setDepartment("");
    setSupervisorId("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (isStarting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(companyEmail.trim())) next.companyEmail = "Enter a valid work email address.";
    if (!EMAIL_RE.test(personalEmail.trim())) next.personalEmail = "Enter a valid personal email address.";
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!middleName.trim()) next.middleName = "Middle name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!birthday) next.birthday = "Birthday is required.";
    else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(birthday);
      selected.setHours(0, 0, 0, 0);
      if (selected > today) next.birthday = "Birthday cannot be in the future.";
    }
    if (!address.trim()) next.address = "Address is required.";
    if (!emergencyContact.trim()) next.emergencyContact = "Emergency contact is required.";
    if (!jobTitle.trim()) next.jobTitle = "Job title is required.";
    if (!department.trim()) next.department = "Department is required.";
    if (!supervisorId) next.supervisorId = "Select a supervisor.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const birthdayIso = birthday!.toISOString().slice(0, 10);

    setIsStarting(true);
    onboard.mutate(
      {
        companyEmail: companyEmail.trim(),
        personalEmail: personalEmail.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        birthday: birthdayIso,
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        supervisorId,
      },
      {
        onSuccess: async (result) => {
          try {
            await sendInvitation(result.onboardingRecord.id);
            toast.success(`Onboarding started and invitation sent to ${result.employee.companyEmail}.`);
          } catch {
            toast.success(`Onboarding started for ${result.employee.companyEmail}.`);
            toast.warning("Invitation email could not be sent. Use Resend invite on the detail page.");
          } finally {
            setIsStarting(false);
            reset();
            onOpenChange(false);
            onStarted(result.employee.id);
          }
        },
        onError: (err) => {
          setIsStarting(false);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Start onboarding</DialogTitle>
          <DialogDescription>
            Pre-fill the new hire&apos;s details and send their onboarding invitation.
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
          <FormField
            label="Personal email"
            htmlFor="ob-personal-email"
            required
            error={errors.personalEmail}
          >
            <Input
              id="ob-personal-email"
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="name.personal@gmail.com"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="First name" htmlFor="ob-first" required error={errors.firstName}>
              <Input
                id="ob-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Maria"
              />
            </FormField>
            <FormField label="Middle name" htmlFor="ob-middle" required error={errors.middleName}>
              <Input
                id="ob-middle"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="e.g. Cruz"
              />
            </FormField>
            <FormField label="Last name" htmlFor="ob-last" required error={errors.lastName}>
              <Input
                id="ob-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Santos"
              />
            </FormField>
          </div>
          <FormField
            label="Birthday"
            required
            error={errors.birthday}
            hint="Type the date or use the calendar — year and month dropdowns make it easy to jump to 2004, etc."
          >
            <DatePicker
              value={birthday}
              onChange={setBirthday}
              disableFuture
            />
          </FormField>
          <FormField label="Address" htmlFor="ob-address" required error={errors.address}>
            <Textarea
              id="ob-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, province"
              rows={2}
            />
          </FormField>
          <FormField
            label="Emergency contact"
            htmlFor="ob-emergency"
            required
            error={errors.emergencyContact}
            hint="Include name and Philippine mobile number, e.g. Juan Santos - 09171234567"
          >
            <Input
              id="ob-emergency"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Name - 09XXXXXXXXX"
            />
          </FormField>
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
          <Button onClick={handleSubmit} disabled={isStarting}>
            <Send aria-hidden="true" />
            {isStarting ? "Starting…" : "Start onboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
