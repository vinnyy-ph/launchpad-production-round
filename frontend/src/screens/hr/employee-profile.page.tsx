"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserRound, ArrowLeft, Pencil, X, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Skeleton,
  Input,
  Combobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  EmptyState,
} from "@/shared/ui";
import { useAllEmployees } from "@/modules/people/employees/hooks/use-employees";
import { toEmployeeOption } from "@/modules/people/employees/employee-options";
import { useEmployeeProfile } from "@/modules/people/employees/hooks/use-employee-profile";
import { useUpdateEmployee } from "@/modules/people/employees/hooks/use-update-employee";
import {
  PEOPLE_TEXT_LIMITS,
  mapPeopleFieldTextError,
  validatePeopleText,
} from "@/modules/people/people-text";
import type {
  EmployeeProfile,
  EmployeeStatus,
} from "@/modules/people/employees/types/employees.types";

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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatAddress(profile: EmployeeProfile): string {
  const a = profile.address;
  if (!a) return "—";
  const parts = [a.address, a.city, a.province, a.country].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function formatEmergencyContact(profile: EmployeeProfile): string {
  const c = profile.emergencyContact;
  if (!c) return "—";
  const parts = [c.emergencyContactName, c.emergencyContactNumber]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "offboarding", label: "Offboarding" },
  { value: "inactive", label: "Inactive" },
];
const DEPARTMENT_NAME_INVALID_MESSAGE =
  "Please enter a valid department name.";

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

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
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
  status: EmployeeStatus;
}

interface InlineEditFormProps {
  draft: EditDraft;
  onChange: (field: keyof EditDraft, value: string) => void;
  supervisorOptions: { value: string; label: string }[];
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

function InlineEditForm({
  draft,
  onChange,
  supervisorOptions,
  saving,
  onSave,
  onCancel,
}: InlineEditFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Job title</span>
        <Input
          value={draft.jobTitle}
          onChange={(e) => onChange("jobTitle", e.target.value)}
          placeholder="Job title"
          className="h-9 text-sm"
          maxLength={PEOPLE_TEXT_LIMITS.JOB_TITLE}
        />
      </div>
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Department</span>
        <Input
          value={draft.department}
          onChange={(e) => onChange("department", e.target.value)}
          placeholder="Department"
          className="h-9 text-sm"
          maxLength={PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME}
        />
      </div>
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Supervisor</span>
        <Combobox
          options={supervisorOptions}
          value={draft.supervisorId}
          onChange={(v) => onChange("supervisorId", v)}
          placeholder="No supervisor"
          searchPlaceholder="Search employees…"
          emptyText="No employees found."
        />
      </div>
      <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-2">
        <span className="pt-2 text-sm font-medium text-[color:var(--text-tertiary)]">Status</span>
        <Select value={draft.status} onValueChange={(v) => onChange("status", v)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" onClick={onSave} disabled={saving} loading={saving}>
          <Check className="mr-1 h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
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
  const id =
    typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const { employee, loading, error, reload } = useEmployeeProfile(id || null);
  const { update, saving } = useUpdateEmployee(id || null);
  // Supervisor options for the edit form (HR sees the full list — fetch the whole directory).
  const { employees } = useAllEmployees();

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({
    jobTitle: "",
    department: "",
    supervisorId: "",
    status: "active",
  });

  const profile = employee as EmployeeProfile | null;

  function startEdit() {
    if (!profile) return;
    setDraft({
      jobTitle: profile.jobTitle ?? "",
      department: profile.department ?? "",
      supervisorId: profile.supervisor?.id ?? "",
      status: profile.status,
    });
    setIsEditing(true);
  }

  function handleDraftChange(field: keyof EditDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEdit() {
    if (!profile) return;
    const trimmedJobTitle = draft.jobTitle.trim();
    const trimmedDepartment = draft.department.trim();
    const jobTitleError = trimmedJobTitle
      ? validatePeopleText(trimmedJobTitle, "Job title", PEOPLE_TEXT_LIMITS.JOB_TITLE)
      : undefined;
    const departmentError = trimmedDepartment
      ? mapPeopleFieldTextError(
          validatePeopleText(
            trimmedDepartment,
            "Department name",
            PEOPLE_TEXT_LIMITS.DEPARTMENT_NAME,
          ),
          DEPARTMENT_NAME_INVALID_MESSAGE,
        )
      : undefined;
    if (jobTitleError || departmentError) {
      toast.error(jobTitleError ?? departmentError);
      return;
    }
    try {
      await update({
        jobTitle: trimmedJobTitle || null,
        department: trimmedDepartment || null,
        supervisorId: draft.supervisorId || null,
        status: draft.status,
      });
      setIsEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    }
  }

  // Keep the draft status in sync if the profile changes while not editing.
  useEffect(() => {
    if (!isEditing && profile) {
      setDraft((prev) => ({ ...prev, status: profile.status }));
    }
  }, [profile, isEditing]);

  // ── Render: loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <ProfileSkeleton />
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div>
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: not found ─────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div>
        <EmptyState
          icon={UserRound}
          title="Employee not found"
          body="This employee record doesn't exist or has been removed."
          action={{ label: "Back to directory", onClick: () => router.push("/hr/directory") }}
        />
      </div>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────

  const supervisorOptions = employees
    .filter((e) => e.id !== profile.id)
    .map(toEmployeeOption);

  const initials = getInitials(profile.fullName);

  // ── Render: success ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
              }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
                {profile.fullName}
              </h1>
              <p className="text-sm text-[color:var(--text-secondary)]">{profile.jobTitle || "—"}</p>
              <p className="mb-2 text-xs text-[color:var(--text-tertiary)]">
                {profile.department || "—"}
              </p>
              <StatusBadge status={profile.status} dot />
            </div>
          </div>

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
          <SectionLabel>Employment details</SectionLabel>
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
            supervisorOptions={supervisorOptions}
            saving={saving}
            onSave={() => void saveEdit()}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="divide-y divide-[color:var(--border-primary)]">
            <DetailRow label="Company email" value={profile.companyEmail} />
            <DetailRow label="Job title" value={profile.jobTitle || "—"} />
            <DetailRow label="Department" value={profile.department || "—"} />
            <DetailRow label="Supervisor" value={profile.supervisor?.fullName ?? "—"} />
            <DetailRow
              label="Team/s"
              value={profile.teams.length ? profile.teams.map((t) => t.name).join(", ") : "—"}
            />
            {profile.user && (
              <DetailRow
                label="Role"
                value={
                  <span className="rounded bg-[color:var(--bg-secondary)] px-1.5 py-0.5 font-mono text-xs text-[color:var(--text-secondary)]">
                    {profile.user.role}
                  </span>
                }
              />
            )}
          </div>
        )}
      </div>

      {/* Personal & sensitive information (HR/Admin/self see full; redacted profiles omit these). */}
      <div
        className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <div className="mb-4">
          <SectionLabel>Personal information</SectionLabel>
        </div>
        <div className="divide-y divide-[color:var(--border-primary)]">
          <DetailRow label="Personal email" value={profile.personalEmail || "—"} />
          <DetailRow label="Date of birth" value={formatDate(profile.birthday)} />
          <DetailRow label="Home address" value={formatAddress(profile)} />
          <DetailRow label="Emergency contact" value={formatEmergencyContact(profile)} />
        </div>
      </div>

      {profile.customFields !== undefined && (
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-6"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="mb-4">
            <SectionLabel>Custom fields</SectionLabel>
          </div>
          <div className="divide-y divide-[color:var(--border-primary)]">
            {profile.customFields.length === 0 ? (
              <DetailRow label="Answers" value="No custom fields defined." />
            ) : (
              profile.customFields.map((field) => {
                const answer = field.value?.trim();
                return (
                  <DetailRow
                    key={field.id}
                    label={field.fieldLabel}
                    value={
                      answer ? (
                        answer
                      ) : (
                        <span className="italic text-[color:var(--text-tertiary)]">
                          {field.isRequired ? "Awaiting answer (required)" : "Not answered"}
                        </span>
                      )
                    }
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
