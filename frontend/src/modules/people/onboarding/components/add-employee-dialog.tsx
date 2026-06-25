"use client";

import { useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  PhAddressFields,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { isValidPhilippinePhone } from "@/shared/lib/phone";
import { useAllEmployees } from "@/modules/people/employees/hooks/use-employees";
import { toEmployeeOption } from "@/modules/people/employees/employee-options";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
import {
  PEOPLE_TEXT_LIMITS,
  getLatestAllowedEmployeeBirthday,
  validateEmployeeBirthday,
  validatePeopleNameLanguage,
  validatePeopleFieldText,
  validatePeopleText,
} from "@/modules/people/people-text";
import { useOnboardEmployee } from "../hooks/use-onboard-employee";
import { useDocumentConfigs } from "../hooks/use-document-configs";
import { sendInvitation } from "../services/onboarding.service";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the invite is sent with the new employee's id (e.g. to navigate or refetch). */
  onStarted: (employeeId: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTERS_ONLY_RE = /^[A-Za-z\s]+$/;
const JOB_TITLE_RE = /^[A-Za-z0-9\s.,'’/&()-]+$/;
const STREET_ADDRESS_RE = /^[A-Za-z0-9\s.,#'’/&()-]+$/;

const ADD_EMPLOYEE_FIELD_MESSAGES = {
  firstNameRequired: "First name is required.",
  firstName: "Please enter a valid first name using letters only.",
  middleName: "Please enter a valid middle name using letters only.",
  lastNameRequired: "Last name is required.",
  lastName: "Please enter a valid last name using letters only.",
  companyEmailRequired: "Work email is required.",
  companyEmail: "Please enter a valid work email address.",
  jobTitleRequired: "Job title is required.",
  jobTitle:
    "Please enter a valid job title using letters, numbers, spaces, and common punctuation only.",
  personalEmail: "Please enter a valid personal email address.",
  address:
    "Please enter a valid street address using letters, numbers, and standard address characters only.",
  emergencyContactName: "Please enter a valid contact name using letters only.",
} as const;

interface FieldErrors {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  companyEmail?: string;
  jobTitle?: string;
  department?: string;
  supervisorId?: string;
  personalEmail?: string;
  birthday?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
}

interface FormSnapshot {
  firstName: string;
  middleName: string;
  lastName: string;
  companyEmail: string;
  jobTitle: string;
  department: string;
  supervisorId: string;
  personalEmail: string;
  birthday: Date | undefined;
  address: string;
  city: string;
  province: string;
  country: string;
  emergencyContactName: string;
  emergencyContact: string;
}

function hasFormData(form: FormSnapshot): boolean {
  return Boolean(
    form.firstName.trim() ||
      form.middleName.trim() ||
      form.lastName.trim() ||
      form.companyEmail.trim() ||
      form.jobTitle.trim() ||
      form.department ||
      form.supervisorId ||
      form.personalEmail.trim() ||
      form.birthday ||
      form.address.trim() ||
      form.city.trim() ||
      form.province.trim() ||
      // country is auto-defaulted to Philippines, so it doesn't count as user-entered data.
      form.emergencyContactName.trim() ||
      form.emergencyContact.trim(),
  );
}

/**
 * Adds an employee and emails them an onboarding invite to finish the rest themselves.
 * Identity + role fields are required; the pre-fill group is optional and simply saves
 * the new hire a step. On success it sends the invitation and reports the new employee id.
 */
export function AddEmployeeDialog({ open, onOpenChange, onStarted }: AddEmployeeDialogProps) {
  const { employees: activeEmployees } = useAllEmployees({ status: "active" });
  const { departments, loading: departmentsLoading } = useDepartments();
  const { documents: requiredDocuments, loading: docsLoading } = useDocumentConfigs();
  const onboard = useOnboardEmployee();

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [birthday, setBirthday] = useState<Date | undefined>();
  const latestAllowedBirthday = useMemo(() => getLatestAllowedEmployeeBirthday(), []);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  // PH-only deployment: the address picker fixes the country to Philippines.
  const [country, setCountry] = useState("Philippines");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [shakeUnsavedAlert, setShakeUnsavedAlert] = useState(false);
  const unsavedToastIdRef = useRef<string | number | null>(null);

  const hasUnsavedChanges = hasFormData({
    firstName,
    middleName,
    lastName,
    companyEmail,
    jobTitle,
    department,
    supervisorId,
    personalEmail,
    birthday,
    address,
    city,
    province,
    country,
    emergencyContactName,
    emergencyContact,
  });

  // A supervisor must belong to the new hire's department (a supervisor with no department is
  // exempt — mirrors the same-department rule). Options are scoped to the chosen department.
  const supervisorOptions = activeEmployees
    .filter((employee) => !employee.department || employee.department === department)
    .map(toEmployeeOption);

  const requiredDocsNote = docsLoading
    ? "loading…"
    : requiredDocuments.length > 0
      ? requiredDocuments.map((document) => document.documentName).join(", ")
      : "none set yet";

  function reset() {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setCompanyEmail("");
    setJobTitle("");
    setDepartment("");
    setSupervisorId("");
    setPersonalEmail("");
    setBirthday(undefined);
    setAddress("");
    setCity("");
    setProvince("");
    setCountry("Philippines");
    setEmergencyContactName("");
    setEmergencyContact("");
    setErrors({});
  }

  function alertUnsavedChanges() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(90);
    }

    if (unsavedToastIdRef.current) {
      toast.dismiss(unsavedToastIdRef.current);
    }

    const toastId = `add-employee-unsaved-changes-${Date.now()}`;
    unsavedToastIdRef.current = toastId;
    window.requestAnimationFrame(() => {
      toast.error("There are unsaved changes. Send the invite or discard them before closing.", {
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

  function handleOpenChange(next: boolean) {
    if (isSending) return;
    if (!next && hasUnsavedChanges) {
      alertUnsavedChanges();
      return;
    }
    if (!next) reset();
    onOpenChange(next);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const trimmedFirst = firstName.trim();
    const trimmedMiddle = middleName.trim();
    const trimmedLast = lastName.trim();
    const trimmedCompanyEmail = companyEmail.trim();
    const trimmedJobTitle = jobTitle.trim();
    const trimmedPersonalEmail = personalEmail.trim();
    const trimmedAddress = address.trim();
    const trimmedEmergencyName = emergencyContactName.trim();

    if (!trimmedFirst) {
      next.firstName = ADD_EMPLOYEE_FIELD_MESSAGES.firstNameRequired;
    } else if (validatePeopleNameLanguage(trimmedFirst)) {
      next.firstName = validatePeopleNameLanguage(trimmedFirst);
    } else if (
      !LETTERS_ONLY_RE.test(trimmedFirst) ||
      validatePeopleText(trimmedFirst, "First name", PEOPLE_TEXT_LIMITS.NAME)
    ) {
      next.firstName = ADD_EMPLOYEE_FIELD_MESSAGES.firstName;
    }
    if (
      trimmedMiddle &&
      (validatePeopleNameLanguage(trimmedMiddle) ||
        !LETTERS_ONLY_RE.test(trimmedMiddle) ||
        validatePeopleText(trimmedMiddle, "Middle name", PEOPLE_TEXT_LIMITS.NAME))
    ) {
      next.middleName =
        validatePeopleNameLanguage(trimmedMiddle) ?? ADD_EMPLOYEE_FIELD_MESSAGES.middleName;
    }
    if (!trimmedLast) {
      next.lastName = ADD_EMPLOYEE_FIELD_MESSAGES.lastNameRequired;
    } else if (validatePeopleNameLanguage(trimmedLast)) {
      next.lastName = validatePeopleNameLanguage(trimmedLast);
    } else if (
      !LETTERS_ONLY_RE.test(trimmedLast) ||
      validatePeopleText(trimmedLast, "Last name", PEOPLE_TEXT_LIMITS.NAME)
    ) {
      next.lastName = ADD_EMPLOYEE_FIELD_MESSAGES.lastName;
    }
    if (!trimmedCompanyEmail) {
      next.companyEmail = ADD_EMPLOYEE_FIELD_MESSAGES.companyEmailRequired;
    } else if (validatePeopleNameLanguage(trimmedCompanyEmail)) {
      next.companyEmail = validatePeopleNameLanguage(trimmedCompanyEmail);
    } else if (
      !EMAIL_RE.test(trimmedCompanyEmail) ||
      validatePeopleText(trimmedCompanyEmail, "Work email", PEOPLE_TEXT_LIMITS.EMAIL)
    ) {
      next.companyEmail = ADD_EMPLOYEE_FIELD_MESSAGES.companyEmail;
    }
    if (!trimmedJobTitle) {
      next.jobTitle = ADD_EMPLOYEE_FIELD_MESSAGES.jobTitleRequired;
    } else if (validatePeopleNameLanguage(trimmedJobTitle)) {
      next.jobTitle = validatePeopleNameLanguage(trimmedJobTitle);
    } else if (
      !JOB_TITLE_RE.test(trimmedJobTitle) ||
      validatePeopleText(trimmedJobTitle, "Job title", PEOPLE_TEXT_LIMITS.JOB_TITLE)
    ) {
      next.jobTitle = ADD_EMPLOYEE_FIELD_MESSAGES.jobTitle;
    }
    if (
      trimmedPersonalEmail &&
      (validatePeopleNameLanguage(trimmedPersonalEmail) ||
        !EMAIL_RE.test(trimmedPersonalEmail) ||
        validatePeopleText(trimmedPersonalEmail, "Personal email", PEOPLE_TEXT_LIMITS.EMAIL))
    ) {
      next.personalEmail =
        validatePeopleNameLanguage(trimmedPersonalEmail) ??
        ADD_EMPLOYEE_FIELD_MESSAGES.personalEmail;
    }
    if (
      trimmedAddress &&
      (validatePeopleNameLanguage(trimmedAddress) ||
        !STREET_ADDRESS_RE.test(trimmedAddress) ||
        validatePeopleText(trimmedAddress, "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE))
    ) {
      next.address =
        validatePeopleNameLanguage(trimmedAddress) ?? ADD_EMPLOYEE_FIELD_MESSAGES.address;
    }
    if (
      trimmedEmergencyName &&
      (validatePeopleNameLanguage(trimmedEmergencyName) ||
        !LETTERS_ONLY_RE.test(trimmedEmergencyName) ||
        validatePeopleText(trimmedEmergencyName, "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME))
    ) {
      next.emergencyContactName =
        validatePeopleNameLanguage(trimmedEmergencyName) ??
        ADD_EMPLOYEE_FIELD_MESSAGES.emergencyContactName;
    }

    const locationChecks: Array<[keyof FieldErrors, string, string, number]> = [
      ["city", city.trim(), "City", PEOPLE_TEXT_LIMITS.LOCATION],
      ["province", province.trim(), "Province", PEOPLE_TEXT_LIMITS.LOCATION],
      ["country", country.trim(), "Country", PEOPLE_TEXT_LIMITS.LOCATION],
    ];
    for (const [field, value, label, maxLen] of locationChecks) {
      const error = value ? validatePeopleFieldText(value, label, maxLen) : undefined;
      if (error) next[field] = error;
    }
    if (!department.trim()) next.department = "Select a department.";
    if (!supervisorId) next.supervisorId = "Select a supervisor.";
    const birthdayError = validateEmployeeBirthday(birthday);
    if (birthdayError) next.birthday = birthdayError;
    return next;
  }

  function validateField(field: keyof FieldErrors, value: string): string | undefined {
    const trimmed = value.trim();

    if (field === "firstName") {
      if (!trimmed) return ADD_EMPLOYEE_FIELD_MESSAGES.firstNameRequired;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "First name", PEOPLE_TEXT_LIMITS.NAME)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.firstName
        : undefined;
    }

    if (field === "middleName") {
      if (!trimmed) return undefined;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Middle name", PEOPLE_TEXT_LIMITS.NAME)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.middleName
        : undefined;
    }

    if (field === "lastName") {
      if (!trimmed) return ADD_EMPLOYEE_FIELD_MESSAGES.lastNameRequired;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Last name", PEOPLE_TEXT_LIMITS.NAME)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.lastName
        : undefined;
    }

    if (field === "companyEmail") {
      if (!trimmed) return ADD_EMPLOYEE_FIELD_MESSAGES.companyEmailRequired;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !EMAIL_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Work email", PEOPLE_TEXT_LIMITS.EMAIL)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.companyEmail
        : undefined;
    }

    if (field === "jobTitle") {
      if (!trimmed) return ADD_EMPLOYEE_FIELD_MESSAGES.jobTitleRequired;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !JOB_TITLE_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Job title", PEOPLE_TEXT_LIMITS.JOB_TITLE)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.jobTitle
        : undefined;
    }

    if (field === "personalEmail") {
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return trimmed &&
        (!EMAIL_RE.test(trimmed) ||
          validatePeopleText(trimmed, "Personal email", PEOPLE_TEXT_LIMITS.EMAIL))
        ? ADD_EMPLOYEE_FIELD_MESSAGES.personalEmail
        : undefined;
    }

    if (field === "address") {
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return trimmed &&
        (!STREET_ADDRESS_RE.test(trimmed) ||
          validatePeopleText(trimmed, "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE))
        ? ADD_EMPLOYEE_FIELD_MESSAGES.address
        : undefined;
    }

    if (field === "emergencyContactName") {
      if (!trimmed) return undefined;
      const languageError = validatePeopleNameLanguage(trimmed);
      if (languageError) return languageError;
      return !LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME)
        ? ADD_EMPLOYEE_FIELD_MESSAGES.emergencyContactName
        : undefined;
    }

    if (field === "city" || field === "province" || field === "country") {
      const label = field[0].toUpperCase() + field.slice(1);
      return trimmed ? validatePeopleFieldText(trimmed, label, PEOPLE_TEXT_LIMITS.LOCATION) : undefined;
    }

    return undefined;
  }

  function setFieldError(field: keyof FieldErrors, message: string | undefined) {
    setErrors((current) => {
      const next = { ...current };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  }

  function updateTextField(field: keyof FieldErrors, value: string, setter: (value: string) => void) {
    setter(value);
    setFieldError(field, validateField(field, value));
  }

  async function handleSubmit() {
    const next = validate();
    const trimmedEmergencyPhone = emergencyContact.trim();
    if (trimmedEmergencyPhone) {
      if (!(await isValidPhilippinePhone(trimmedEmergencyPhone))) {
        next.emergencyContact = "Enter a valid Philippine mobile number.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const trimmedMiddle = middleName.trim();
    const trimmedPersonal = personalEmail.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedProvince = province.trim();
    const trimmedCountry = country.trim();
    const trimmedEmergencyName = emergencyContactName.trim();

    setIsSending(true);
    onboard.mutate(
      {
        companyEmail: companyEmail.trim(),
        jobTitle: jobTitle.trim(),
        department: department.trim(),
        supervisorId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(trimmedMiddle ? { middleName: trimmedMiddle } : {}),
        ...(trimmedPersonal ? { personalEmail: trimmedPersonal } : {}),
        ...(birthday ? { birthday: birthday.toISOString().slice(0, 10) } : {}),
        ...(trimmedAddress ? { address: trimmedAddress } : {}),
        ...(trimmedCity ? { city: trimmedCity } : {}),
        ...(trimmedProvince ? { province: trimmedProvince } : {}),
        ...(trimmedCountry ? { country: trimmedCountry } : {}),
        ...(trimmedEmergencyName ? { emergencyContactName: trimmedEmergencyName } : {}),
        ...(trimmedEmergencyPhone ? { emergencyContact: trimmedEmergencyPhone } : {}),
      },
      {
        onSuccess: async (result) => {
          const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
          try {
            await sendInvitation(result.onboardingRecord.id);
            toast.success(`Invite sent · ${fullName} added to Onboarding`);
          } catch {
            toast.success(`${fullName} added to Onboarding.`);
            toast.warning("Invitation email could not be sent. Use Resend invite on the detail page.");
          } finally {
            setIsSending(false);
            reset();
            onOpenChange(false);
            onStarted(result.employee.id);
          }
        },
        onError: (err) => {
          setIsSending(false);
          toast.error(err instanceof Error ? err.message : "Could not add the employee.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl [&>button]:z-20 ${
          shakeUnsavedAlert ? "employee-unsaved-alert-shake" : ""
        }`}
      >
        {/* Pinned header so it stays visible while the form body scrolls. */}
        <DialogHeader className="border-b border-[color:var(--border-primary)] px-6 pb-4 pt-6">
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Pre-fill what you know, and we&apos;ll email them an invite to finish onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Who they are</h3>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
              <FormField label="First name" htmlFor="add-first" required error={errors.firstName}>
                <Input
                  id="add-first"
                  value={firstName}
                  onChange={(event) =>
                    updateTextField("firstName", event.target.value, setFirstName)
                  }
                  placeholder="e.g. Maria"
                  maxLength={PEOPLE_TEXT_LIMITS.NAME}
                />
              </FormField>
              <FormField label="Middle name" htmlFor="add-middle" error={errors.middleName}>
                <Input
                  id="add-middle"
                  value={middleName}
                  onChange={(event) =>
                    updateTextField("middleName", event.target.value, setMiddleName)
                  }
                  placeholder="Optional"
                  maxLength={PEOPLE_TEXT_LIMITS.NAME}
                />
              </FormField>
              <FormField label="Last name" htmlFor="add-last" required error={errors.lastName}>
                <Input
                  id="add-last"
                  value={lastName}
                  onChange={(event) =>
                    updateTextField("lastName", event.target.value, setLastName)
                  }
                  placeholder="e.g. Santos"
                  maxLength={PEOPLE_TEXT_LIMITS.NAME}
                />
              </FormField>
            </div>
            <FormField
              label="Work email"
              htmlFor="add-email"
              required
              error={errors.companyEmail}
              hint="This becomes their sign-in, and where we send the invite."
            >
              <Input
                id="add-email"
                type="email"
                value={companyEmail}
                onChange={(event) =>
                  updateTextField("companyEmail", event.target.value, setCompanyEmail)
                }
                placeholder="name@company.com"
                maxLength={PEOPLE_TEXT_LIMITS.EMAIL}
              />
            </FormField>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Their role</h3>
            <FormField label="Job title" htmlFor="add-title" required error={errors.jobTitle}>
              <Input
                id="add-title"
                value={jobTitle}
                onChange={(event) => updateTextField("jobTitle", event.target.value, setJobTitle)}
                placeholder="e.g. Nurse"
                maxLength={PEOPLE_TEXT_LIMITS.JOB_TITLE}
              />
            </FormField>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <FormField label="Department" required error={errors.department}>
                <Select
                  value={department}
                  onValueChange={(value) => {
                    setDepartment(value);
                    setFieldError("department", value ? undefined : "Select a department.");
                    // The current supervisor may no longer belong to the new department —
                    // clear it so the user re-picks from the scoped list.
                    setSupervisorId("");
                    setFieldError("supervisorId", "Select a supervisor.");
                  }}
                >
                  <SelectTrigger aria-label="Select department">
                    <SelectValue
                      placeholder={departmentsLoading ? "Loading departments…" : "Select a department"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((option) => (
                      <SelectItem key={option.id} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Supervisor"
                required
                error={department ? errors.supervisorId : undefined}
              >
                <Combobox
                  options={supervisorOptions}
                  value={supervisorId}
                  onChange={(value) => {
                    setSupervisorId(value || "");
                    setFieldError("supervisorId", value ? undefined : "Select a supervisor.");
                  }}
                  disabled={!department}
                  placeholder={department ? "Select a supervisor…" : "Select a department first"}
                  searchPlaceholder="Search employees…"
                  emptyText={department ? `No active employees in ${department}.` : "No employees found."}
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">
                Pre-fill for the new hire (optional)
              </h3>
              <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                Anything you add saves them a step. They&apos;ll confirm or complete the rest when
                they accept the invite.
              </p>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <FormField label="Personal email" htmlFor="add-personal" error={errors.personalEmail}>
                <Input
                  id="add-personal"
                  type="email"
                  value={personalEmail}
                  onChange={(event) =>
                    updateTextField("personalEmail", event.target.value, setPersonalEmail)
                  }
                  placeholder="name.personal@gmail.com"
                  maxLength={PEOPLE_TEXT_LIMITS.EMAIL}
                />
              </FormField>
              <FormField
                label="Birthday"
                error={errors.birthday}
                hint="Use the year and month dropdowns in the calendar to jump back quickly."
              >
                <DatePicker
                  value={birthday}
                  onChange={setBirthday}
                  disableFuture
                  maxDate={latestAllowedBirthday}
                />
              </FormField>
            </div>

            <div className="space-y-4 border-t border-[color:var(--border-primary)] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Address
              </h4>
              <PhAddressFields
                idPrefix="add"
                value={{ country, province, city, address }}
                errors={{
                  country: errors.country,
                  province: errors.province,
                  city: errors.city,
                  address: errors.address,
                }}
                onChange={(patch) => {
                  if (patch.address !== undefined) {
                    updateTextField("address", patch.address, setAddress);
                  }
                  if (patch.country !== undefined) {
                    updateTextField("country", patch.country, setCountry);
                  }
                  if (patch.province !== undefined) {
                    updateTextField("province", patch.province, setProvince);
                  }
                  if (patch.city !== undefined) {
                    updateTextField("city", patch.city, setCity);
                  }
                }}
              />
            </div>

            <div className="space-y-4 border-t border-[color:var(--border-primary)] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Emergency contact
              </h4>
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <FormField
                  label="Contact name"
                  htmlFor="add-emergency-name"
                  error={errors.emergencyContactName}
                >
                  <Input
                    id="add-emergency-name"
                    value={emergencyContactName}
                    onChange={(event) =>
                      updateTextField(
                        "emergencyContactName",
                        event.target.value,
                        setEmergencyContactName,
                      )
                    }
                    placeholder="e.g. Juan Santos"
                    maxLength={PEOPLE_TEXT_LIMITS.NAME}
                  />
                </FormField>
                <FormField
                  label="Contact number"
                  htmlFor="add-emergency"
                  error={errors.emergencyContact}
                >
                  <PhoneInput
                    id="add-emergency"
                    value={emergencyContact}
                    onChange={setEmergencyContact}
                    error={Boolean(errors.emergencyContact)}
                    placeholder="Enter phone number"
                  />
                </FormField>
              </div>
            </div>
          </section>

          <p className="rounded-lg border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] px-3 py-2 text-xs text-[color:var(--text-secondary)]">
            They&apos;ll be asked to upload the required documents you set in Onboarding setup
            (currently: {requiredDocsNote}).
          </p>
        </div>

        <DialogFooter className="border-t border-[color:var(--border-primary)] px-6 pb-6 pt-4">
          {hasUnsavedChanges ? (
            <Button type="button" variant="secondary" disabled={isSending} onClick={reset}>
              Discard
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isSending}>
            <Send aria-hidden="true" />
            {isSending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
