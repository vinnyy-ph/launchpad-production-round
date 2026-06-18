"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, UserRound, ArrowLeft, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { readCollection, writeCollection } from "@/shared/mock/db";
import type { DemoEmployee, OnboardingCase, Team } from "@/shared/mock/types";
import {
  Button,
  Skeleton,
  Progress,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  StatusBadge,
  EmptyState,
} from "@/shared/ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
      {children}
    </p>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-3">
      <span className="text-sm font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      {/* Card skeleton */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline edit form
// ---------------------------------------------------------------------------

interface EditDraft {
  jobTitle: string;
  department: string;
  supervisorId: string;
}

interface InlineEditFormProps {
  draft: EditDraft;
  onChange: (field: keyof EditDraft, value: string) => void;
  employees: DemoEmployee[];
  currentEmployeeId: string;
  onSave: () => void;
  onCancel: () => void;
}

function InlineEditForm({
  draft,
  onChange,
  employees,
  currentEmployeeId,
  onSave,
  onCancel,
}: InlineEditFormProps) {
  const supervisorOptions = employees.filter((e) => e.employeeId !== currentEmployeeId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Job title</span>
        <Input
          value={draft.jobTitle}
          onChange={(e) => onChange("jobTitle", e.target.value)}
          placeholder="Job title"
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Department</span>
        <Input
          value={draft.department}
          onChange={(e) => onChange("department", e.target.value)}
          placeholder="Department"
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Supervisor</span>
        <Select
          value={draft.supervisorId || "__none__"}
          onValueChange={(v) => onChange("supervisorId", v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="No supervisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No supervisor</SelectItem>
            {supervisorOptions.map((emp) => (
              <SelectItem key={emp.employeeId} value={emp.employeeId}>
                {emp.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={onSave}>
          <Check className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding progress card
// ---------------------------------------------------------------------------

function OnboardingProgressCard({ onboardingCase }: { onboardingCase: OnboardingCase }) {
  const approvedDocs = onboardingCase.documents.filter((d) => d.status === "APPROVED").length;
  const totalDocs = onboardingCase.documents.length;

  return (
    <div
      className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Onboarding Progress</SectionLabel>
        <StatusBadge status={onboardingCase.status} />
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[color:var(--text-secondary)]">Overall completion</span>
          <span className="text-sm font-semibold text-[color:var(--text-primary)]">
            {onboardingCase.progress}%
          </span>
        </div>
        <Progress value={onboardingCase.progress} className="h-2" />
      </div>

      {totalDocs > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <p className="text-xs font-medium text-[color:var(--text-tertiary)]">
              Documents — {approvedDocs}/{totalDocs} approved
            </p>
            <div className="space-y-1.5">
              {onboardingCase.documents.map((doc, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[color:var(--text-secondary)]">{doc.name}</span>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-[color:var(--text-tertiary)]">
        Invited {formatDate(onboardingCase.invitedAt)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<DemoEmployee | null>(null);
  const [allEmployees, setAllEmployees] = useState<DemoEmployee[]>([]);
  const [onboardingCase, setOnboardingCase] = useState<OnboardingCase | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({ jobTitle: "", department: "", supervisorId: "" });

  // Load data on mount
  useEffect(() => {
    const employees = readCollection<DemoEmployee>("employees");
    const found = employees.find((e) => e.employeeId === id) ?? null;
    const onboarding = readCollection<OnboardingCase>("onboardingCases");
    const foundCase = onboarding.find((c) => c.employeeId === id) ?? null;
    const teams = readCollection<Team>("teams");
    const foundTeam = found?.teamId ? (teams.find((t) => t.id === found.teamId) ?? null) : null;

    setAllEmployees(employees);
    setEmployee(found);
    setOnboardingCase(foundCase);
    setTeam(foundTeam);
    setLoading(false);
  }, [id]);

  function startEdit() {
    if (!employee) return;
    setDraft({
      jobTitle: employee.jobTitle,
      department: employee.department,
      supervisorId: employee.supervisorId ?? "",
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function handleDraftChange(field: keyof EditDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function saveEdit() {
    if (!employee) return;
    const updated: DemoEmployee = {
      ...employee,
      jobTitle: draft.jobTitle.trim() || employee.jobTitle,
      department: draft.department.trim() || employee.department,
      supervisorId: draft.supervisorId || null,
    };
    const rows = allEmployees.map((e) => (e.employeeId === employee.employeeId ? updated : e));
    writeCollection<DemoEmployee>("employees", rows);
    setEmployee(updated);
    setAllEmployees(rows);
    setIsEditing(false);
    toast.success("Profile updated");
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div>
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/hr/directory">Directory</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Skeleton className="h-4 w-24" />
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ProfileSkeleton />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: not found
  // ---------------------------------------------------------------------------

  if (!employee) {
    return (
      <div>
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/hr/directory">Directory</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Not found</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <EmptyState
          icon={UserRound}
          title="Employee not found"
          body="This employee record doesn't exist or has been removed."
          action={{ label: "Back to directory", onClick: () => router.push("/hr/directory") }}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const supervisorEmployee = employee.supervisorId
    ? allEmployees.find((e) => e.employeeId === employee.supervisorId) ?? null
    : null;

  const initials = getInitials(employee.displayName);

  // ---------------------------------------------------------------------------
  // Render: success
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/hr">People</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/hr/directory">Directory</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{employee.displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Profile header */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
              }}
              aria-hidden="true"
            >
              {initials}
            </div>

            {/* Name + title + status */}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
                {employee.displayName}
              </h1>
              <p className="text-sm text-[color:var(--text-secondary)]">
                {employee.jobTitle || "—"}
              </p>
              <p className="mb-2 text-xs text-[color:var(--text-tertiary)]">
                {employee.department || "—"}
              </p>
              <StatusBadge status={employee.employeeStatus} dot />
            </div>
          </div>

          {/* Back button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/hr/directory")}
            className="self-start"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Directory
          </Button>
        </div>
      </div>

      {/* Employment details card */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Employment Details</SectionLabel>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <InlineEditForm
            draft={draft}
            onChange={handleDraftChange}
            employees={allEmployees}
            currentEmployeeId={employee.employeeId}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        ) : (
          <div className="divide-y divide-[color:var(--border-primary)]">
            <DetailRow label="Email" value={employee.email} />
            <DetailRow label="Job title" value={employee.jobTitle || "—"} />
            <DetailRow label="Department" value={employee.department || "—"} />
            <DetailRow label="Start date" value={formatDate(employee.startDate)} />
            <DetailRow
              label="Supervisor"
              value={supervisorEmployee ? supervisorEmployee.displayName : "—"}
            />
            <DetailRow label="Team" value={team ? team.name : "—"} />
            <DetailRow
              label="Role"
              value={
                <span className="rounded bg-[color:var(--bg-secondary)] px-1.5 py-0.5 text-xs font-mono text-[color:var(--text-secondary)]">
                  {employee.role}
                </span>
              }
            />
          </div>
        )}
      </div>

      {/* Redacted sensitive fields */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="mb-4">
          <SectionLabel>Sensitive Information</SectionLabel>
        </div>
        <div className="space-y-3">
          {["Date of birth", "Emergency contact", "Home address"].map((field) => (
            <div
              key={field}
              className="grid grid-cols-[160px_1fr] items-center gap-x-4 rounded-lg bg-[color:var(--bg-tertiary)] px-4 py-3"
            >
              <span className="text-sm font-medium text-[color:var(--text-tertiary)]">{field}</span>
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--text-tertiary)]" aria-hidden="true" />
                <span className="text-xs italic text-[color:var(--text-tertiary)]">
                  Redacted — visible to HR, Admin, and subject only
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding progress (conditional) */}
      {onboardingCase && <OnboardingProgressCard onboardingCase={onboardingCase} />}
    </div>
  );
}
