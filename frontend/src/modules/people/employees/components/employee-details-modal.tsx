import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  BriefcaseBusiness,
  Check,
  Eye,
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
import { Combobox } from "@/shared/ui/primitives/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { DatePicker } from "@/shared/ui/primitives/date-picker";
import { Input } from "@/shared/ui/primitives/input";
import { PhoneInput } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { StatusBadge } from "@/shared/ui/patterns";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import { ApiError } from "@/shared/lib/api-client";
import { isStrictPhilippineMobile, toPhilippineE164 } from "@/shared/lib/phone";
import type { EmployeeDocument, EmployeeDocumentStatus } from "../services/employees.service";
import { ProfileActivityHistory } from "./profile-activity-history";
import { PhAddressFields } from "@/shared/ui/patterns/ph-address-fields";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import { PEOPLE_TEXT_LIMITS, validatePeopleText } from "@/modules/people/people-text";
import { useEmployeeActivityLogs } from "../hooks/use-employee-activity-logs";
import { useEmployeeDocuments } from "../hooks/use-employee-documents";
import { useEmployeeProfile } from "../hooks/use-employee-profile";
import { useAllEmployees } from "../hooks/use-employees";
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
  birthday: string;
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
  supervisorId: string;
};

const NO_DEPARTMENT = "__none__";

/** PH-only deployment: the address country is fixed to the Philippines. */
const PH_COUNTRY = "Philippines";

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

const GENERIC_SAVE_ERROR =
  "We couldn't save these changes. Please review the highlighted fields and try again.";

/**
 * Maps known backend validation messages to friendly, descriptive copy. Messages stay
 * helpful without disclosing internal details (IDs, roles, or data that isn't the editor's).
 * Unknown failures fall back to a safe generic message so backend internals never leak.
 */
const SAVE_ERROR_MESSAGES: Record<string, string> = {
  "Circular supervisory relationship detected":
    "That supervisor can't be assigned — it would create a reporting loop, where someone ends up reporting to a person who reports to them.",
  "Another employee is already the root node":
    "Every employee needs a supervisor except the top of the organization, and that spot is already taken. Assign a supervisor instead of leaving this field empty.",
  "Employee cannot supervise themselves": "An employee can't be set as their own supervisor.",
  "Supervisor must belong to the same department":
    "A supervisor must be in the same department as the employee, or be the organization root (e.g. the CEO). Choose a valid supervisor.",
  "Supervisor not found":
    "The selected supervisor is no longer available. Please refresh the page and choose another.",
  "Invalid employee birthday": "Please enter a valid birthday.",
};

const PROFILE_LETTERS_ONLY_RE = /^[A-Za-z\s]+$/;
const PROFILE_JOB_TITLE_RE = /^[A-Za-z0-9\s.,'’/&()-]+$/;
const PROFILE_STREET_ADDRESS_RE = /^[A-Za-z0-9\s.,#'’/&()-]+$/;

const PROFILE_FIELD_MESSAGES: Partial<Record<keyof EditDraft, string>> = {
  firstName: "Please enter a valid first name using letters only.",
  middleName: "Please enter a valid middle name using letters only.",
  lastName: "Please enter a valid last name using letters only.",
  personalEmail: "Please enter a valid personal email address.",
  companyEmail: "Please enter a valid company email address (e.g., name@company.com).",
  address:
    "Please enter a valid street address using letters, numbers, and standard address characters only.",
  emergencyContactName: "Please enter a valid contact name using letters only.",
  jobTitle:
    "Please enter a valid role using letters, numbers, spaces, and common punctuation only.",
};

const PROFILE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateProfileField(field: keyof EditDraft, value: string): string | undefined {
  const trimmed = value.trim();

  if (field === "firstName") {
    return !trimmed ||
      !PROFILE_LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "First name", PEOPLE_TEXT_LIMITS.NAME)
      ? PROFILE_FIELD_MESSAGES.firstName
      : undefined;
  }

  if (field === "middleName") {
    return trimmed &&
      (!PROFILE_LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Middle name", PEOPLE_TEXT_LIMITS.NAME))
      ? PROFILE_FIELD_MESSAGES.middleName
      : undefined;
  }

  if (field === "lastName") {
    return !trimmed ||
      !PROFILE_LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "Last name", PEOPLE_TEXT_LIMITS.NAME)
      ? PROFILE_FIELD_MESSAGES.lastName
      : undefined;
  }

  if (field === "personalEmail") {
    return trimmed &&
      (!PROFILE_EMAIL_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Personal email", PEOPLE_TEXT_LIMITS.EMAIL))
      ? PROFILE_FIELD_MESSAGES.personalEmail
      : undefined;
  }

  if (field === "companyEmail") {
    return !PROFILE_EMAIL_RE.test(trimmed) ||
      validatePeopleText(trimmed, "Company email", PEOPLE_TEXT_LIMITS.EMAIL)
      ? PROFILE_FIELD_MESSAGES.companyEmail
      : undefined;
  }

  if (field === "address") {
    return trimmed &&
      (!PROFILE_STREET_ADDRESS_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE))
      ? PROFILE_FIELD_MESSAGES.address
      : undefined;
  }

  if (field === "emergencyContactName") {
    return trimmed &&
      (!PROFILE_LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Contact name", PEOPLE_TEXT_LIMITS.NAME))
      ? PROFILE_FIELD_MESSAGES.emergencyContactName
      : undefined;
  }

  if (field === "jobTitle") {
    return trimmed &&
      (!PROFILE_JOB_TITLE_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Role", PEOPLE_TEXT_LIMITS.JOB_TITLE))
      ? PROFILE_FIELD_MESSAGES.jobTitle
      : undefined;
  }

  if (field === "country" || field === "province" || field === "city") {
    const label = field[0].toUpperCase() + field.slice(1);
    return trimmed ? validatePeopleText(trimmed, label, PEOPLE_TEXT_LIMITS.LOCATION) : undefined;
  }

  return undefined;
}

function validateDraftText(draft: EditDraft): Partial<Record<keyof EditDraft, string>> {
  const errors: Partial<Record<keyof EditDraft, string>> = {};
  for (const field of Object.keys(draft) as (keyof EditDraft)[]) {
    const error = validateProfileField(field, draft[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

function inferDraftFieldFromMessage(message: string | undefined): keyof EditDraft | null {
  if (!message) return null;
  const rawField = message.match(/^([A-Za-z.]+) must /)?.[1];
  if (!rawField) return null;
  const aliases: Record<string, keyof EditDraft> = {
    firstName: "firstName",
    middleName: "middleName",
    lastName: "lastName",
    personalEmail: "personalEmail",
    companyEmail: "companyEmail",
    address: "address",
    city: "city",
    province: "province",
    country: "country",
    emergencyContactName: "emergencyContactName",
    emergencyContactNumber: "emergencyContactNumber",
    jobTitle: "jobTitle",
    department: "department",
  };
  return aliases[rawField] ?? null;
}

function friendlyProfileError(field: keyof EditDraft, fallback: string): string {
  return PROFILE_FIELD_MESSAGES[field] ?? fallback;
}

/**
 * Resolves a user-facing message from a failed profile save. Prefers a friendly mapping keyed
 * on the API's field-level message, then the top-level message, then a safe generic fallback.
 */
function resolveSaveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldMessage = err.fieldErrors.find((entry) => entry.message)?.message;
    if (fieldMessage && SAVE_ERROR_MESSAGES[fieldMessage]) {
      return SAVE_ERROR_MESSAGES[fieldMessage];
    }
    if (err.message && SAVE_ERROR_MESSAGES[err.message]) {
      return SAVE_ERROR_MESSAGES[err.message];
    }
  }

  return GENERIC_SAVE_ERROR;
}

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
    birthday: "",
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
    supervisorId: "",
  };
}

function draftFromProfile(profile: EmployeeProfile | EmployeeListItem): EditDraft {
  const profileDetails = profile as EmployeeProfile;

  return {
    firstName: profile.firstName ?? "",
    middleName: profile.middleName ?? "",
    lastName: profile.lastName ?? "",
    // The API returns birthday as a full ISO datetime (e.g. "1990-05-15T00:00:00.000Z");
    // keep only the date portion so the date field parses it and the draft compares cleanly.
    birthday: profileDetails.birthday ? profileDetails.birthday.slice(0, 10) : "",
    personalEmail: profileDetails.personalEmail ?? "",
    companyEmail: profile.companyEmail ?? "",
    // PH-only deployment: default an empty country to Philippines so the address dropdowns resolve.
    country: profile.address?.country?.trim() || PH_COUNTRY,
    province: profile.address?.province ?? "",
    city: profile.address?.city ?? "",
    address: profile.address?.address ?? "",
    emergencyContactName: profile.emergencyContact?.emergencyContactName ?? "",
    // Normalize to E.164 so PhoneInput's emitted value matches the saved draft (no false "unsaved").
    emergencyContactNumber: toPhilippineE164(profile.emergencyContact?.emergencyContactNumber ?? ""),
    jobTitle: profile.jobTitle ?? "",
    department: profile.department ?? "",
    status: profile.status,
    supervisorId: profile.supervisor?.id ?? "",
  };
}

function draftsMatch(left: EditDraft, right: EditDraft): boolean {
  return (Object.keys(left) as (keyof EditDraft)[]).every((key) => left[key] === right[key]);
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function formatActivityDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DOCUMENT_STATUS_STYLES: Record<EmployeeDocumentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]" },
  approved: { label: "Approved", className: "bg-[#ECFDF3] text-[#027A48] border-[#6CE9A6]" },
  rejected: { label: "Rejected", className: "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]" },
};

/** Detects whether a stored document URL points to an image (vs a PDF/other file). */
function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url.split("?")[0]);
}

function DetailSection({ title, icon: Icon, children }: DetailSectionProps) {
  return (
    <section className="pb-9">
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
  error,
  maxLength,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  maxLength?: number;
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
        error={Boolean(error)}
        maxLength={maxLength}
      />
      {error ? <span className="mt-1 block text-xs text-[#D92D20]">{error}</span> : null}
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
  const { logs: activityLogs, loading: activityLoading } = useEmployeeActivityLogs(employeeId);
  const { documents, loading: documentsLoading } = useEmployeeDocuments(employeeId);
  const { departments, loading: departmentsLoading } = useDepartments();
  const { employees: allEmployees } = useAllEmployees();
  const profile = employee ?? fallbackEmployee;
  const profileDetails = profile as EmployeeProfile | null;
  const [draft, setDraft] = useState<EditDraft>(blankDraft);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EditDraft, string>>>({});
  const [contactNumberError, setContactNumberError] = useState<string | null>(null);
  const [shakeUnsavedAlert, setShakeUnsavedAlert] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<EmployeeDocument | null>(null);
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

  // Supervisorship is confined to a single department, so only offer employees in the
  // same department as the one currently selected in the draft. An empty draft department
  // ("") matches employees with no department. The organization root (an employee with no
  // supervisor, e.g. the CEO) is always offered so a department head can report upward
  // across departments.
  const supervisorOptions = useMemo(
    () =>
      allEmployees
        .filter((emp) => emp.id !== employeeId)
        .filter((emp) => (emp.department ?? "") === draft.department || emp.supervisor === null)
        .map((emp) => ({ value: emp.id, label: emp.fullName })),
    [allEmployees, employeeId, draft.department],
  );

  // Resolved from the fetched list first, then falls back to the saved profile supervisor
  // so the context fields show correctly even before the full employee list loads.
  const selectedSupervisor = useMemo(() => {
    if (!draft.supervisorId) return null;
    const fromList = allEmployees.find((emp) => emp.id === draft.supervisorId);
    if (fromList) return { email: fromList.companyEmail, jobTitle: fromList.jobTitle };
    if (profile?.supervisor?.id === draft.supervisorId) {
      return { email: profile.supervisor.companyEmail, jobTitle: profile.supervisor.jobTitle };
    }
    return null;
  }, [allEmployees, draft.supervisorId, profile]);

  useEffect(() => {
    if (profile) {
      setDraft(savedDraft);
      setFieldErrors({});
      setContactNumberError(null);
    }
  }, [profile, savedDraft]);

  function scrollToSection(section: EmployeeDetailsSection) {
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateDraft(field: keyof EditDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      const error = validateProfileField(field, value);
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
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

    const nextFieldErrors = validateDraftText(draft);
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    // Emergency contact is optional, but when provided it must be a valid PH mobile.
    const contactNumber = draft.emergencyContactNumber.trim();
    if (contactNumber && !isStrictPhilippineMobile(contactNumber)) {
      setContactNumberError("Enter an 11-digit mobile number starting with 09.");
      toast.error("Please fix the highlighted contact number.");
      return;
    }

    const input: EmployeeUpdateInput = {
      firstName: draft.firstName.trim(),
      middleName: nullableTrim(draft.middleName),
      lastName: draft.lastName.trim(),
      birthday: nullableTrim(draft.birthday),
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
      // Only include supervisorId when the user changed it — avoids running the cycle
      // check on every save and prevents false positives from pre-existing DB data.
      ...(draft.supervisorId !== savedDraft.supervisorId
        ? { supervisorId: draft.supervisorId || null }
        : {}),
    };

    try {
      await update(input);
      toast.success("Employee details updated");
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldMessage = err.fieldErrors.find((entry) => entry.message)?.message;
        const field = inferDraftFieldFromMessage(fieldMessage);
        if (field && fieldMessage) {
          setFieldErrors((current) => ({
            ...current,
            [field]: friendlyProfileError(field, fieldMessage),
          }));
        }
      }
      toast.error(resolveSaveErrorMessage(err));
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`directory-profile-dialog h-[88vh] w-[90vw] max-w-[90vw] origin-center gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:z-30 [&>button]:p-1 [&>button]:text-[color:var(--text-secondary)] ${
          shakeUnsavedAlert ? "employee-unsaved-alert-shake" : ""
        }`}
        onAnimationEnd={() => setShakeUnsavedAlert(false)}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Employee details
        </DialogTitle>
        <DialogDescription className="sr-only">
          Employee personal information, employment details, documents, and activity.
        </DialogDescription>

        <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] bg-white">
          <aside className="flex min-h-0 flex-col border-r border-[color:var(--border-primary)] bg-white">
            {profile ? (
              <>
                <div className="border-b border-[color:var(--border-primary)] px-6 py-6 text-center">
                  <UserAvatar
                    src={profile.avatarUrl}
                    fallback={initials(profile)}
                    className="mx-auto h-20 w-20"
                    fallbackClassName="text-lg font-bold text-[color:var(--text-primary)]"
                    fallbackStyle={{
                      background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                    }}
                  />
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
                Employee details
              </h2>
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
                              error={fieldErrors.firstName}
                              maxLength={PEOPLE_TEXT_LIMITS.NAME}
                            />
                            <EditableField
                              label="Middle name"
                              value={draft.middleName}
                              onChange={(value) => updateDraft("middleName", value)}
                              placeholder="Optional"
                              error={fieldErrors.middleName}
                              maxLength={PEOPLE_TEXT_LIMITS.NAME}
                            />
                            <EditableField
                              label="Last name"
                              value={draft.lastName}
                              onChange={(value) => updateDraft("lastName", value)}
                              required
                              error={fieldErrors.lastName}
                              maxLength={PEOPLE_TEXT_LIMITS.NAME}
                            />
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <EditableField
                              label="Personal email"
                              type="email"
                              value={draft.personalEmail}
                              onChange={(value) => updateDraft("personalEmail", value)}
                              error={fieldErrors.personalEmail}
                              maxLength={PEOPLE_TEXT_LIMITS.EMAIL}
                            />
                            <EditableField
                              label="Company email"
                              type="email"
                              value={draft.companyEmail}
                              onChange={(value) => updateDraft("companyEmail", value)}
                              required
                              error={fieldErrors.companyEmail}
                              maxLength={PEOPLE_TEXT_LIMITS.EMAIL}
                            />
                          </div>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <label>
                              <span className="mb-2 block text-xs font-medium text-[color:var(--text-tertiary)]">
                                Birthday
                              </span>
                              <DatePicker
                                disableFuture
                                value={draft.birthday ? new Date(`${draft.birthday}T00:00:00`) : undefined}
                                onChange={(next) =>
                                  updateDraft("birthday", next ? format(next, "yyyy-MM-dd") : "")
                                }
                                className="w-full"
                              />
                            </label>
                          </div>

                          <div>
                            <p className="mb-3 text-xs font-bold text-[color:var(--text-primary)]">
                              Address
                            </p>
                            <div className="flex flex-col gap-4">
                              <PhAddressFields
                                idPrefix="emp-details"
                                value={{
                                  country: draft.country,
                                  province: draft.province,
                                  city: draft.city,
                                  address: draft.address,
                                }}
                                errors={{
                                  country: fieldErrors.country,
                                  province: fieldErrors.province,
                                  city: fieldErrors.city,
                                  address: fieldErrors.address,
                                }}
                                onChange={(patch) => {
                                  setDraft((current) => ({ ...current, ...patch }));
                                  setFieldErrors((current) => {
                                    const next = { ...current };
                                    for (const key of Object.keys(patch) as Array<
                                      Extract<keyof EditDraft, "country" | "province" | "city" | "address">
                                    >) {
                                      const error = validateProfileField(key, patch[key] ?? "");
                                      if (error) next[key] = error;
                                      else delete next[key];
                                    }
                                    return next;
                                  });
                                }}
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
                                error={fieldErrors.emergencyContactName}
                                maxLength={PEOPLE_TEXT_LIMITS.NAME}
                              />
                              <label>
                                <span className="mb-2 block text-xs font-medium text-[color:var(--text-tertiary)]">
                                  Contact Number
                                </span>
                                <PhoneInput
                                  value={draft.emergencyContactNumber}
                                  onChange={(value) => {
                                    updateDraft("emergencyContactNumber", value);
                                    if (contactNumberError) setContactNumberError(null);
                                  }}
                                  error={Boolean(contactNumberError || fieldErrors.emergencyContactNumber)}
                                />
                                {contactNumberError || fieldErrors.emergencyContactNumber ? (
                                  <span className="mt-1 block text-xs text-[#D92D20]">
                                    {contactNumberError ?? fieldErrors.emergencyContactNumber}
                                  </span>
                                ) : null}
                              </label>
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
                              label="Job Title"
                              value={draft.jobTitle}
                              onChange={(value) => updateDraft("jobTitle", value)}
                              error={fieldErrors.jobTitle}
                              maxLength={PEOPLE_TEXT_LIMITS.JOB_TITLE}
                            />
                            <EditableSelect
                              label="Department"
                              value={draft.department || NO_DEPARTMENT}
                              onChange={(value) => {
                                const nextDepartment = value === NO_DEPARTMENT ? "" : value;
                                // Reset the supervisor on department change so a now-invalid
                                // cross-department selection can't linger; the user re-picks from
                                // the new department's list (the org root stays selectable there).
                                setDraft((current) => ({
                                  ...current,
                                  department: nextDepartment,
                                  supervisorId: "",
                                }));
                              }}
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
                              <label>
                                <span className="mb-2 block text-xs font-medium text-[color:var(--text-tertiary)]">
                                  Assign supervisor
                                </span>
                                <Combobox
                                  options={supervisorOptions}
                                  value={draft.supervisorId}
                                  onChange={(value) => updateDraft("supervisorId", value)}
                                  placeholder="No supervisor (root node)"
                                  searchPlaceholder="Search employees…"
                                  emptyText="No employees found."
                                />
                              </label>
                              <ReadField
                                label="Email"
                                value={selectedSupervisor?.email}
                              />
                              <ReadField
                                label="Title / lead"
                                value={selectedSupervisor?.jobTitle}
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
                              Is a member of
                            </p>
                            {profile.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {profile.teams.map((team) => (
                                  <Badge
                                    key={team.id}
                                    variant="outline"
                                    pill
                                    className="max-w-[110px] truncate rounded-full border-[#B2DDFF] bg-[#EFF8FF] font-semibold text-[#175CD3]"
                                  >
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
                              Leads
                            </p>
                            {profileDetails?.ledTeams?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {profileDetails.ledTeams.map((team) => (
                                  <Badge
                                    key={team.id}
                                    variant="outline"
                                    pill
                                    className="max-w-[110px] truncate rounded-full border-[#ABEFC6] bg-[#ECFDF3] font-semibold text-[#067647]"
                                  >
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
                      {documentsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={index}
                              className="h-16 rounded-lg bg-[color:var(--bg-secondary)]"
                            />
                          ))}
                        </div>
                      ) : documents.length === 0 ? (
                        <EmptyPanel
                          title="No documents yet"
                          body="Uploaded employee files will appear here."
                        />
                      ) : (
                        <ul className="space-y-3">
                          {documents.map((document) => {
                            const statusStyle = DOCUMENT_STATUS_STYLES[document.status];
                            return (
                              <li
                                key={document.id}
                                className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--border-primary)] bg-white p-4"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--bg-secondary)]">
                                    <FileText
                                      className="h-5 w-5 text-[color:var(--text-secondary)]"
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-[color:var(--text-primary)]">
                                      {document.documentName}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
                                      Uploaded {formatActivityDate(document.submittedAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle.className}`}
                                  >
                                    {statusStyle.label}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setViewingDocument(document)}
                                    aria-label={`View ${document.documentName}`}
                                  >
                                    <Eye /> View
                                  </Button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </DetailSection>
                  </div>

                  <div ref={(node) => { sectionRefs.current.activity = node; }} className="scroll-mt-[88px]">
                    <DetailSection title="Activity History" icon={History}>
                      <ProfileActivityHistory logs={activityLogs} loading={activityLoading} />
                    </DetailSection>
                  </div>
                </div>
              ) : null}
            </div>

            {profile && hasUnsavedChanges ? (
              <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-[color:var(--border-primary)] bg-white px-8 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setDraft(savedDraft);
                    setContactNumberError(null);
                    setFieldErrors({});
                  }}
                >
                  Discard
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  <Check /> {saving ? "Saving..." : "Save changes"}
                </Button>
              </footer>
            ) : null}
            </form>
          </main>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog
      open={viewingDocument !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setViewingDocument(null);
      }}
    >
      <DialogContent className="grid h-[88vh] w-[90vw] max-w-[90vw] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogTitle className="border-b border-[color:var(--border-primary)] px-6 py-4 pr-12 text-base font-bold text-[color:var(--text-primary)]">
          {viewingDocument?.documentName ?? "Document"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Preview of the selected employee document.
        </DialogDescription>
        {viewingDocument ? (
          <div className="flex min-h-0 items-center justify-center overflow-auto bg-[color:var(--bg-secondary)] p-4">
            {isImageUrl(viewingDocument.fileUrl) ? (
              <img
                src={viewingDocument.fileUrl}
                alt={viewingDocument.documentName}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <iframe
                src={viewingDocument.fileUrl}
                title={viewingDocument.documentName}
                sandbox="allow-same-origin"
                className="h-full w-full border-0 bg-white"
              />
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
