"use client";

import { useState } from "react";
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
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { isValidPhilippinePhone } from "@/shared/lib/phone";
import { useEmployees } from "@/modules/people/employees/hooks/use-employees";
import { useDepartments } from "@/modules/people/departments/hooks/use-departments";
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

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  companyEmail?: string;
  jobTitle?: string;
  department?: string;
  supervisorId?: string;
  personalEmail?: string;
  birthday?: string;
  emergencyContact?: string;
}

/**
 * Adds an employee and emails them an onboarding invite to finish the rest themselves.
 * Identity + role fields are required; the pre-fill group is optional and simply saves
 * the new hire a step. On success it sends the invitation and reports the new employee id.
 */
export function AddEmployeeDialog({ open, onOpenChange, onStarted }: AddEmployeeDialogProps) {
  const { employees: activeEmployees } = useEmployees({ status: "active", limit: 100 });
  const { departments } = useDepartments();
  const { documents: requiredDocuments } = useDocumentConfigs();
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
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);

  const supervisorOptions = activeEmployees.map((employee) => ({
    value: employee.id,
    label: `${employee.fullName} · ${employee.companyEmail}`,
  }));

  const requiredDocsNote =
    requiredDocuments.length > 0
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
    setCountry("");
    setEmergencyContactName("");
    setEmergencyContact("");
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    if (isSending) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!EMAIL_RE.test(companyEmail.trim())) next.companyEmail = "Enter a valid work email address.";
    if (!jobTitle.trim()) next.jobTitle = "Job title is required.";
    if (!department.trim()) next.department = "Select a department.";
    if (!supervisorId) next.supervisorId = "Select a supervisor.";

    // Optional fields are only validated when provided.
    if (personalEmail.trim() && !EMAIL_RE.test(personalEmail.trim())) {
      next.personalEmail = "Enter a valid personal email address.";
    }
    if (birthday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(birthday);
      selected.setHours(0, 0, 0, 0);
      if (selected > today) next.birthday = "Birthday cannot be in the future.";
    }
    return next;
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Pre-fill what you know, and we&apos;ll email them an invite to finish onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Who they are</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="First name" htmlFor="add-first" required error={errors.firstName}>
                <Input
                  id="add-first"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="e.g. Maria"
                />
              </FormField>
              <FormField label="Middle name" htmlFor="add-middle">
                <Input
                  id="add-middle"
                  value={middleName}
                  onChange={(event) => setMiddleName(event.target.value)}
                  placeholder="Optional"
                />
              </FormField>
              <FormField label="Last name" htmlFor="add-last" required error={errors.lastName}>
                <Input
                  id="add-last"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="e.g. Santos"
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
                onChange={(event) => setCompanyEmail(event.target.value)}
                placeholder="name@company.com"
              />
            </FormField>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Their role</h3>
            <FormField label="Job title" htmlFor="add-title" required error={errors.jobTitle}>
              <Input
                id="add-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="e.g. Nurse"
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Department" required error={errors.department}>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger aria-label="Select department">
                    <SelectValue placeholder="Select a department" />
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
              <FormField label="Supervisor" required error={errors.supervisorId}>
                <Combobox
                  options={supervisorOptions}
                  value={supervisorId}
                  onChange={(value) => setSupervisorId(value || "")}
                  placeholder="Select a supervisor…"
                  searchPlaceholder="Search employees…"
                  emptyText="No active employees found."
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
            <FormField label="Personal email" htmlFor="add-personal" error={errors.personalEmail}>
              <Input
                id="add-personal"
                type="email"
                value={personalEmail}
                onChange={(event) => setPersonalEmail(event.target.value)}
                placeholder="name.personal@gmail.com"
              />
            </FormField>
            <FormField
              label="Birthday"
              error={errors.birthday}
              hint="Use the year and month dropdowns in the calendar to jump back quickly."
            >
              <DatePicker value={birthday} onChange={setBirthday} disableFuture />
            </FormField>

            <div className="space-y-4 border-t border-[color:var(--border-primary)] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Address
              </h4>
              <FormField label="Street address" htmlFor="add-address">
                <Input
                  id="add-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="House/unit no., street, barangay"
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Country" htmlFor="add-country">
                  <Input
                    id="add-country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    placeholder="e.g. Philippines"
                  />
                </FormField>
                <FormField label="Province" htmlFor="add-province">
                  <Input
                    id="add-province"
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    placeholder="e.g. Metro Manila"
                  />
                </FormField>
                <FormField label="City" htmlFor="add-city">
                  <Input
                    id="add-city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="e.g. Quezon City"
                  />
                </FormField>
              </div>
            </div>

            <div className="space-y-4 border-t border-[color:var(--border-primary)] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                Emergency contact
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Contact name" htmlFor="add-emergency-name">
                  <Input
                    id="add-emergency-name"
                    value={emergencyContactName}
                    onChange={(event) => setEmergencyContactName(event.target.value)}
                    placeholder="e.g. Juan Santos"
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

        <DialogFooter>
          <Button variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSending}>
            <Send aria-hidden="true" />
            {isSending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
