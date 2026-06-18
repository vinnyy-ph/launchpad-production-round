import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  Check,
  FileText,
  History,
  LogOut,
  Send,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { StatusBadge } from "@/shared/ui/patterns";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { useEmployeeProfile } from "../hooks/use-employee-profile";
import { useUpdateEmployee } from "../hooks/use-update-employee";
import type {
  EmployeeListItem,
  EmployeeProfile,
  EmployeeStatus,
  EmployeeUpdateInput,
} from "../types/employees.types";

interface EmployeeDetailsModalProps {
  employeeId: string | null;
  fallbackEmployee: EmployeeListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

type EmployeeDetailsSection = "personal" | "employment" | "teams" | "documents" | "activity";
type EditDraft = {
  firstName: string;
  middleName: string;
  lastName: string;
  personalEmail: string;
  companyEmail: string;
  country: string;
  province: string;
  city: string;
  address: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  jobTitle: string;
  department: string;
  status: EmployeeStatus;
};

const NO_DEPARTMENT = "__none__";

const DETAIL_SECTIONS: { value: EmployeeDetailsSection; label: string; icon: LucideIcon }[] = [
  { value: "personal", label: "Personal Information", icon: UserRound },
  { value: "employment", label: "Employment Details", icon: BriefcaseBusiness },
  { value: "teams", label: "Teams", icon: Users },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "activity", label: "Activity History", icon: History },
];

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "active", label: "Active" },
  { value: "offboarding", label: "Offboarding" },
  { value: "inactive", label: "Inactive" },
];

function fullName(employee: EmployeeListItem): string {
  return (
    employee.fullName ||
    [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ")
  );
}

function initials(employee: EmployeeListItem): string {
  const letters = (employee.firstName?.[0] ?? "") + (employee.lastName?.[0] ?? "");
  return (letters || employee.companyEmail[0]).toUpperCase();
}

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "-";
}

function formatTimelineDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function statusLabel(status: EmployeeStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function sidebarActionLabel(status: EmployeeStatus): string | null {
  if (status === "onboarding") return "Resend Onboarding Invitation";
  if (status === "active") return "Process offboarding";
  return null;
}

function sidebarActionStyles(status: EmployeeStatus): string {
  if (status === "onboarding") {
    return "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3] hover:bg-[#D1E9FF]";
  }

  return "border-[#FECDCA] bg-white text-[#B42318] hover:bg-[#FEF3F2]";
}

function blankDraft(): EditDraft {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    personalEmail: "",
    companyEmail: "",
    country: "",
    province: "",
    city: "",
    address: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
    jobTitle: "",
    department: "",
    status: "active",
  };
}

function draftFromProfile(profile: EmployeeProfile | EmployeeListItem): EditDraft {
  const profileDetails = profile as EmployeeProfile;

  return {
    firstName: profile.firstName ?? "",
    middleName: profile.middleName ?? "",
    lastName: profile.lastName ?? "",
    personalEmail: profileDetails.personalEmail ?? "",
    companyEmail: profile.companyEmail ?? "",
    country: profile.address?.country ?? "",
    province: profile.address?.province ?? "",
    city: profile.address?.city ?? "",
    address: profile.address?.address ?? "",
    emergencyContactName: profile.emergencyContact?.emergencyContactName ?? "",
    emergencyContactNumber: profile.emergencyContact?.emergencyContactNumber ?? "",
    jobTitle: profile.jobTitle ?? "",
    department: profile.department ?? "",
    status: profile.status,
  };
}

function draftsMatch(left: EditDraft, right: EditDraft): boolean {
  return (Object.keys(left) as (keyof EditDraft)[]).every((key) => left[key] === right[key]);
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function DetailSection({ title, icon: Icon, children }: DetailSectionProps) {
  return (
    <section className="border-b border-[color:var(--border-primary)] pb-9">
      <div className="mb-6 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[color:var(--text-secondary)]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ReadField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">{label}</p>
      <div className="flex min-h-10 items-center rounded-lg border border-[color:var(--border-primary)] bg-white px-3 text-sm font-medium text-[color:var(--text-primary)]">
        {displayValue(value)}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-medium text-[color:var(--text-tertiary)]">
        {label}
      </span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function EditableSelect({
  label,
  value,
  onChange,
  children,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium text-[color:var(--text-tertiary)]">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  );
}

function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-4 py-8 text-center">
      <p className="text-sm font-medium text-[color:var(--text-primary)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{body}</p>
    </div>
  );
}

export function EmployeeDetailsModal({
  employeeId,
  fallbackEmployee,
  open,
  onOpenChange,
}: EmployeeDetailsModalProps) {
  const sectionRefs = useRef<Record<EmployeeDetailsSection, HTMLDivElement | null>>({
    personal: null,
    employment: null,
    teams: null,
    documents: null,
    activity: null,
  });
  const { employee, loading, error, reload } = useEmployeeProfile(employeeId);
  const { update, saving } = useUpdateEmployee(employeeId);
  const { departments, loading: departmentsLoading } = useDepartments();
  const profile = employee ?? fallbackEmployee;
  const profileDetails = profile as EmployeeProfile | null;
  const [draft, setDraft] = useState<EditDraft>(blankDraft);
  const [shakeUnsavedAlert, setShakeUnsavedAlert] = useState(false);
  const unsavedToastIdRef = useRef<string | number | null>(null);
  const sidebarAction = profile ? sidebarActionLabel(profile.status) : null;

  const savedDraft = useMemo(() => (profile ? draftFromProfile(profile) : blankDraft()), [profile]);
  const hasUnsavedChanges = profile ? !draftsMatch(draft, savedDraft) : false;

  const departmentOptions = useMemo(() => {
    const names = new Set(departments.map((department) => department.name));
    if (draft.department && !names.has(draft.department)) {
      return [{ id: "current", name: draft.department }, ...departments];
    }
    return departments;
  }, [departments, draft.department]);

  useEffect(() => {
    if (profile) {
      setDraft(savedDraft);
    }
  }, [profile, savedDraft]);

  function scrollToSection(section: EmployeeDetailsSection) {
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateDraft(field: keyof EditDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function alertUnsavedChanges() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(90);
    }

    if (unsavedToastIdRef.current) {
      toast.dismiss(unsavedToastIdRef.current);
    }

    const toastId = `employee-details-unsaved-changes-${Date.now()}`;
    unsavedToastIdRef.current = toastId;
    window.requestAnimationFrame(() => {
      toast.error("There are unsaved changes. Save or discard them before closing.", {
        id: toastId,
        position: "top-center",
        classNames: {
          toast: "employee-unsaved-toast-shake !border-[#B42318] !bg-[#FEF3F2] !text-[#7A271A]",
          title: "!text-[#7A271A]",
        },
      });
    });

    setShakeUnsavedAlert(false);
    window.requestAnimationFrame(() => setShakeUnsavedAlert(true));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && hasUnsavedChanges) {
      alertUnsavedChanges();
      return;
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employeeId) return;

    const input: EmployeeUpdateInput = {
      firstName: draft.firstName.trim(),
      middleName: nullableTrim(draft.middleName),
      lastName: draft.lastName.trim(),
      personalEmail: nullableTrim(draft.personalEmail),
      companyEmail: draft.companyEmail.trim(),
      address: {
        country: nullableTrim(draft.country),
        province: nullableTrim(draft.province),
        city: nullableTrim(draft.city),
        address: nullableTrim(draft.address),
      },
      emergencyContact: {
        emergencyContactName: nullableTrim(draft.emergencyContactName),
        emergencyContactNumber: nullableTrim(draft.emergencyContactNumber),
      },
      jobTitle: nullableTrim(draft.jobTitle),
      department: nullableTrim(draft.department),
      status: draft.status,
    };

    try {
      await update(input);
      toast.success("Employee details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update employee details");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`directory-profile-dialog h-[88vh] w-[90vw] max-w-[90vw] origin-center gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:z-30 [&>button]:p-1 [&>button]:text-[color:var(--text-secondary)] ${
          shakeUnsavedAlert ? "employee-unsaved-alert-shake" : ""
        }`}
        onAnimationEnd={() => setShakeUnsavedAlert(false)}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {profile ? `${fullName(profile)} employee details` : "Employee details"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Employee personal information, employment details, documents, and activity.
        </DialogDescription>

        <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] bg-white">
          <aside className="flex min-h-0 flex-col border-r border-[color:var(--border-primary)] bg-white">
            {profile ? (
              <>
                <div className="border-b border-[color:var(--border-primary)] px-6 py-6 text-center">
                  <span
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-lg font-bold text-[color:var(--text-primary)]"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                    }}
                  >
                    {initials(profile)}
                  </span>
                  <h2 className="mt-4 truncate text-sm font-bold text-[color:var(--text-primary)]">
                    {fullName(profile)}
                  </h2>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-tertiary)]">
                    {displayValue(profile.jobTitle)}
                  </p>
                  <p className="mt-1 truncate text-xs text-[color:var(--text-tertiary)]">
                    {displayValue(profile.department)}
                  </p>
                  <div className="mt-3 flex justify-center">
                    <StatusBadge status={profile.status} />
                  </div>
                </div>

                <nav
                  className="flex h-auto flex-1 flex-col items-stretch justify-start gap-1 px-3 py-4 text-[color:var(--text-secondary)]"
                  aria-label="Employee details sections"
                >
                  {DETAIL_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.value}
                        type="button"
                        className="inline-flex items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-colors hover:bg-[color:var(--bg-secondary)] hover:text-[color:var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => scrollToSection(section.value)}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {sidebarAction ? (
                  <div className="border-t border-[color:var(--border-primary)] p-4">
                    <Button
                      type="button"
                      variant="secondary"
                      className={`w-full ${sidebarActionStyles(profile.status)}`}
                    >
                      {profile.status === "onboarding" ? <Send /> : <LogOut />} {sidebarAction}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto bg-white">
            <form onSubmit={(event) => void handleSubmit(event)}>
            <header className="sticky top-0 z-10 flex min-h-[64px] items-center justify-between border-b border-[color:var(--border-primary)] bg-white px-8 pr-16">
              <h2 className="truncate text-lg font-bold text-[color:var(--text-primary)]">
                {profile ? `${fullName(profile)} File` : "Employee File"}
              </h2>
              {profile && hasUnsavedChanges ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={saving}
                    onClick={() => setDraft(savedDraft)}
                  >
                    Discard
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    <Check /> {saving ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              ) : null}
            </header>

            <div className="px-8 py-8 pb-24">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 rounded-lg bg-[color:var(--bg-secondary)]"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-lg border border-[color:var(--border-primary)] p-4">
                  <p className="text-sm font-medium text-[color:var(--text-primary)]">{error}</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={() => void reload()}
                  >
                    Try again
                  </Button>
                </div>
              ) : profile ? (
                <div className="space-y-9">
                  <div ref={(node) => { sectionRefs.current.personal = node; }} className="scroll-mt-[88px]">
                    <div className="space-y-9">
                      <DetailSection title="Personal Information" icon={UserRound}>
                        <div className="grid gap-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <EditableField
                              label="First name"
                              value={draft.firstName}
                              onChange={(value) => updateDraft("firstName", value)}
                              required
                            />
                            <EditableField
                              label="Middle name"
                              value={draft.middleName}
                              onChange={(value) => updateDraft("middleName", value)}
                              placeholder="Optional"
                            />
                            <EditableField
                              label="Last name"
                              value={draft.lastName}
                              onChange={(value) => updateDraft("lastName", value)}
                              required
                            />
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <EditableField
                              label="Personal email"
                              type="email"
                              value={draft.personalEmail}
                              onChange={(value) => updateDraft("personalEmail", value)}
                            />
                            <EditableField
                              label="Company email"
                              type="email"
                              value={draft.companyEmail}
                              onChange={(value) => updateDraft("companyEmail", value)}
                              required
                            />
                          </div>

                          <div>
                            <p className="mb-3 text-xs font-bold text-[color:var(--text-primary)]">
                              Address
                            </p>
                            <div className="grid gap-4">
                              <div className="grid gap-4 lg:grid-cols-3">
                                <EditableField
                                  label="Country"
                                  value={draft.country}
                                  onChange={(value) => updateDraft("country", value)}
                                />
                                <EditableField
                                  label="Province"
                                  value={draft.province}
                                  onChange={(value) => updateDraft("province", value)}
                                />
                                <EditableField
                                  label="City"
                                  value={draft.city}
                                  onChange={(value) => updateDraft("city", value)}
                                />
                              </div>
                              <EditableField
                                label="Address"
                                value={draft.address}
                                onChange={(value) => updateDraft("address", value)}
                              />
                            </div>
                          </div>

                          <div>
                            <p className="mb-3 text-xs font-bold text-[color:var(--text-primary)]">
                              Emergency Contacts
                            </p>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <EditableField
                                label="Contact Name"
                                value={draft.emergencyContactName}
                                onChange={(value) => updateDraft("emergencyContactName", value)}
                              />
                              <EditableField
                                label="Contact Number"
                                value={draft.emergencyContactNumber}
                                onChange={(value) => updateDraft("emergencyContactNumber", value)}
                              />
                            </div>
                          </div>
                        </div>
                      </DetailSection>
                    </div>
                  </div>

                  <div ref={(node) => { sectionRefs.current.employment = node; }} className="scroll-mt-[88px]">
                    <div className="space-y-9">
                      <DetailSection title="Employment Details" icon={BriefcaseBusiness}>
                        <div className="grid gap-5">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <EditableField
                              label="Role"
                              value={draft.jobTitle}
                              onChange={(value) => updateDraft("jobTitle", value)}
                            />
                            <EditableSelect
                              label="Department"
                              value={draft.department || NO_DEPARTMENT}
                              onChange={(value) =>
                                updateDraft("department", value === NO_DEPARTMENT ? "" : value)
                              }
                              placeholder={departmentsLoading ? "Loading departments..." : "Select department"}
                            >
                              <SelectItem value={NO_DEPARTMENT}>No department</SelectItem>
                              {departmentOptions.map((department) => (
                                <SelectItem key={department.id} value={department.name}>
                                  {department.name}
                                </SelectItem>
                              ))}
                            </EditableSelect>
                            <EditableSelect
                              label="Employment status"
                              value={draft.status}
                              onChange={(value) => updateDraft("status", value)}
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </EditableSelect>
                          </div>

                          <div>
                            <p className="mb-3 text-xs font-bold text-[color:var(--text-primary)]">
                              Supervisor
                            </p>
                            <div className="grid gap-4 lg:grid-cols-3">
                              <ReadField
                                label="Supervisor name"
                                value={profile.supervisor?.fullName}
                              />
                              <ReadField
                                label="Supervisor email"
                                value={profile.supervisor?.companyEmail}
                              />
                              <ReadField
                                label="Supervisor title / lead"
                                value={profile.supervisor?.jobTitle}
                              />
                            </div>
                          </div>
                        </div>
                      </DetailSection>
                    </div>
                  </div>

                  <div ref={(node) => { sectionRefs.current.teams = node; }} className="scroll-mt-[88px]">
                    <div className="space-y-9">
                      <DetailSection title="Teams" icon={Users}>
                        <div className="space-y-5">
                          <div>
                            <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">
                              Team/s
                            </p>
                            {profile.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {profile.teams.map((team) => (
                                  <Badge key={team.id} variant="brand">
                                    {team.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-[color:var(--text-tertiary)]">
                                No team assignment.
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-medium text-[color:var(--text-tertiary)]">
                              Led Teams
                            </p>
                            {profileDetails?.ledTeams?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {profileDetails.ledTeams.map((team) => (
                                  <Badge key={team.id} variant="success">
                                    {team.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-[color:var(--text-tertiary)]">
                                No led teams.
                              </p>
                            )}
                          </div>
                        </div>
                      </DetailSection>
                    </div>
                  </div>

                  <div ref={(node) => { sectionRefs.current.documents = node; }} className="scroll-mt-[88px]">
                    <DetailSection title="Documents" icon={FileText}>
                      <EmptyPanel
                        title="No documents yet"
                        body="Uploaded employee files will appear here."
                      />
                    </DetailSection>
                  </div>

                  <div ref={(node) => { sectionRefs.current.activity = node; }} className="scroll-mt-[88px]">
                    <DetailSection title="Activity History" icon={History}>
                      <div className="space-y-5">
                        <p className="text-xs font-bold text-[color:var(--text-tertiary)]">
                          Employment Timeline
                        </p>
                        <div className="space-y-6">
                          <div className="relative pl-5">
                            <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#0E9384]" />
                            <p className="text-sm font-bold text-[color:var(--text-primary)]">
                              Onboarded
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                              {formatTimelineDate(profileDetails?.createdAt) || "Date not provided"}
                            </p>
                          </div>
                          <div className="relative pl-5">
                            <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[#0E9384]" />
                            <p className="text-sm font-bold text-[color:var(--text-primary)]">
                              Status changed to {statusLabel(profile.status)}
                            </p>
                            <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                              {formatTimelineDate(profileDetails?.updatedAt) || "Date not provided"}
                            </p>
                            <p className="mt-1 text-xs font-medium text-[color:var(--text-tertiary)]">
                              Updated by People Operations
                            </p>
                          </div>
                        </div>
                      </div>
                    </DetailSection>
                  </div>
                </div>
              ) : null}
            </div>
            </form>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
