"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronRight } from "lucide-react";

import { Button, FormField, Input, PhoneInput } from "@/shared/ui";
import { DatePicker } from "@/shared/ui/primitives/date-picker";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { StatusBadge } from "@/shared/ui/patterns";
import { PhAddressFields } from "@/shared/ui/patterns/ph-address-fields";
import { isStrictPhilippineMobile, toPhilippineE164 } from "@/shared/lib/phone";
import {
  PEOPLE_TEXT_LIMITS,
  getLatestAllowedEmployeeBirthday,
  validateEmployeeBirthday,
  validatePeopleText,
} from "@/modules/people/people-text";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployeeProfile } from "@/modules/people/employees/hooks/use-employee-profile";
import { useMyActivityLogs } from "@/modules/people/employees/hooks/use-employee-activity-logs";
import { useUpdateMyProfile } from "@/modules/people/employees/hooks/use-update-my-profile";
import { ProfileActivityHistory } from "@/modules/people/employees/components/profile-activity-history";
import { RedactedProfileSheet } from "@/modules/people/employees/components/redacted-profile-sheet";
import type {
  EmployeeProfile,
  MyProfileUpdateInput,
} from "@/modules/people/employees/types/employees.types";

// ─── Validation (self-service: names, personal email, birthday, address, emergency contact) ──

const PH_COUNTRY = "Philippines";
const LETTERS_ONLY_RE = /^[A-Za-z\s]+$/;
const STREET_ADDRESS_RE = /^[A-Za-z0-9\s.,#'’/&()-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_MESSAGES: Record<string, string> = {
  firstNameRequired: "First name is required.",
  firstName: "Please enter a valid first name using letters only.",
  middleName: "Please enter a valid middle name using letters only.",
  lastNameRequired: "Last name is required.",
  lastName: "Please enter a valid last name using letters only.",
  personalEmail: "Please enter a valid personal email address.",
  address:
    "Please enter a valid street address using letters, numbers, and standard address characters only.",
  emergencyContactName: "Please enter a valid contact name using letters only.",
  contact: "Enter an 11-digit mobile number starting with 09.",
};

interface Draft {
  firstName: string;
  middleName: string;
  lastName: string;
  personalEmail: string;
  birthday: string; // yyyy-MM-dd
  country: string;
  province: string;
  city: string;
  address: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

function draftFromProfile(profile: EmployeeProfile): Draft {
  return {
    firstName: profile.firstName ?? "",
    middleName: profile.middleName ?? "",
    lastName: profile.lastName ?? "",
    personalEmail: profile.personalEmail ?? "",
    birthday: profile.birthday ? profile.birthday.slice(0, 10) : "",
    country: profile.address?.country?.trim() || PH_COUNTRY,
    province: profile.address?.province ?? "",
    city: profile.address?.city ?? "",
    address: profile.address?.address ?? "",
    emergencyContactName: profile.emergencyContact?.emergencyContactName ?? "",
    emergencyContactNumber: toPhilippineE164(
      profile.emergencyContact?.emergencyContactNumber ?? "",
    ),
  };
}

function nullableTrim(value: string): string | null {
  return value.trim() || null;
}

function validateField(field: keyof Draft | "contact", value: string): string | undefined {
  const trimmed = value.trim();

  if (field === "firstName") {
    if (!trimmed) return FIELD_MESSAGES.firstNameRequired;
    return !LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "First name", PEOPLE_TEXT_LIMITS.NAME)
      ? FIELD_MESSAGES.firstName
      : undefined;
  }
  if (field === "middleName") {
    return trimmed &&
      (!LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Middle name", PEOPLE_TEXT_LIMITS.NAME))
      ? FIELD_MESSAGES.middleName
      : undefined;
  }
  if (field === "lastName") {
    if (!trimmed) return FIELD_MESSAGES.lastNameRequired;
    return !LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "Last name", PEOPLE_TEXT_LIMITS.NAME)
      ? FIELD_MESSAGES.lastName
      : undefined;
  }
  if (field === "personalEmail") {
    return trimmed &&
      (!EMAIL_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Personal email", PEOPLE_TEXT_LIMITS.EMAIL))
      ? FIELD_MESSAGES.personalEmail
      : undefined;
  }
  if (field === "birthday") {
    return validateEmployeeBirthday(trimmed);
  }
  if (field === "address") {
    return trimmed &&
      (!STREET_ADDRESS_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE))
      ? FIELD_MESSAGES.address
      : undefined;
  }
  if (field === "emergencyContactName") {
    return trimmed &&
      (!LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME))
      ? FIELD_MESSAGES.emergencyContactName
      : undefined;
  }
  if (field === "country" || field === "province" || field === "city") {
    const label = field[0].toUpperCase() + field.slice(1);
    return trimmed ? validatePeopleText(trimmed, label, PEOPLE_TEXT_LIMITS.LOCATION) : undefined;
  }
  if (field === "emergencyContactNumber") {
    return trimmed
      ? validatePeopleText(trimmed, "Emergency contact number", PEOPLE_TEXT_LIMITS.PHONE_DISPLAY)
      : undefined;
  }
  return undefined;
}

// ─── Layout helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

// ─── Tab ────────────────────────────────────────────────────────────────────────

/**
 * Self-service profile tab. The employee edits their own personal details inline
 * (names, personal email, birthday, home address, emergency contact); work fields
 * (company email, job title, department, supervisor, teams, status) and custom fields
 * are HR-controlled and shown read-only. Saving goes through PATCH /api/v1/employees/me.
 */
export function MyProfileTab() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || null;
  const { employee, loading, error, reload } = useEmployeeProfile(employeeId);
  const profile = employee as EmployeeProfile | null;
  const { logs: activityLogs, loading: activityLoading } = useMyActivityLogs(!!employeeId);
  const { update, saving } = useUpdateMyProfile(employeeId);
  const latestAllowedBirthday = useMemo(() => getLatestAllowedEmployeeBirthday(), []);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "contact", string>>>({});
  const [supervisorOpen, setSupervisorOpen] = useState(false);

  // Seed (and re-seed) the editable form whenever the loaded profile changes.
  useEffect(() => {
    if (profile) {
      const seeded = draftFromProfile(profile);
      setDraft(seeded);
      setBaseline(seeded);
      setErrors({});
    }
  }, [profile]);

  const dirty = useMemo(
    () => Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline)),
    [draft, baseline],
  );

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    // Clear a field's error as the user edits it; errors only surface on Save.
    setErrors((current) => {
      if (!current[key] && !(key === "emergencyContactNumber" && current.contact)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      if (key === "emergencyContactNumber") delete next.contact;
      return next;
    });
  }

  async function handleSave() {
    if (!draft) return;
    const next: typeof errors = {};
    for (const field of Object.keys(draft) as (keyof Draft)[]) {
      const err = validateField(field, draft[field]);
      if (err) next[field] = err;
    }
    const contact = draft.emergencyContactNumber.trim();
    if (contact && !isStrictPhilippineMobile(contact)) {
      next.contact = FIELD_MESSAGES.contact;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const input: MyProfileUpdateInput = {
      firstName: draft.firstName.trim(),
      middleName: nullableTrim(draft.middleName),
      lastName: draft.lastName.trim(),
      personalEmail: nullableTrim(draft.personalEmail),
      birthday: nullableTrim(draft.birthday),
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
    };

    try {
      await update(input);
      setBaseline(draft);
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your profile.");
    }
  }

  // ── States ──
  if (loading || (!draft && !error && employeeId)) {
    return (
      <div className="space-y-6 px-8 py-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!employeeId) {
    return (
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            No employee record is linked to this account.
          </span>
        </div>
      </div>
    );
  }

  if (error || !profile || !draft) {
    return (
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            {error ?? "Could not load your profile."}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex min-h-[64px] items-center border-b border-[color:var(--border-primary)] bg-white px-8 pr-16">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">My profile</h2>
      </header>

      <div className="space-y-9 px-8 py-8">
        {/* Editable: personal information */}
        <Section title="Personal information">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="First name" htmlFor="mp-first" error={errors.firstName}>
              <Input
                id="mp-first"
                value={draft.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                maxLength={PEOPLE_TEXT_LIMITS.NAME}
              />
            </FormField>
            <FormField label="Middle name" htmlFor="mp-middle" error={errors.middleName}>
              <Input
                id="mp-middle"
                value={draft.middleName}
                onChange={(e) => set("middleName", e.target.value)}
                placeholder="Optional"
                maxLength={PEOPLE_TEXT_LIMITS.NAME}
              />
            </FormField>
            <FormField label="Last name" htmlFor="mp-last" error={errors.lastName}>
              <Input
                id="mp-last"
                value={draft.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                maxLength={PEOPLE_TEXT_LIMITS.NAME}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Personal email" htmlFor="mp-personal-email" error={errors.personalEmail}>
              <Input
                id="mp-personal-email"
                type="email"
                value={draft.personalEmail}
                onChange={(e) => set("personalEmail", e.target.value)}
                placeholder="you@example.com"
                maxLength={PEOPLE_TEXT_LIMITS.EMAIL}
              />
            </FormField>
            <FormField label="Date of birth" error={errors.birthday}>
              <DatePicker
                disableFuture
                maxDate={latestAllowedBirthday}
                value={draft.birthday ? new Date(`${draft.birthday}T00:00:00`) : undefined}
                onChange={(next) => set("birthday", next ? format(next, "yyyy-MM-dd") : "")}
                className="w-full"
              />
            </FormField>
          </div>
        </Section>

        {/* Editable: home address */}
        <Section title="Home address">
          <PhAddressFields
            idPrefix="mp-address"
            value={{
              country: draft.country,
              province: draft.province,
              city: draft.city,
              address: draft.address,
            }}
            errors={{
              country: errors.country,
              province: errors.province,
              city: errors.city,
              address: errors.address,
            }}
            onChange={(patch) => {
              setDraft((current) => (current ? { ...current, ...patch } : current));
              // Clear any shown errors for edited address fields; new errors surface on Save.
              setErrors((current) => {
                const nextErrors = { ...current };
                for (const key of Object.keys(patch) as Array<
                  Extract<keyof Draft, "country" | "province" | "city" | "address">
                >) {
                  delete nextErrors[key];
                }
                return nextErrors;
              });
            }}
          />
        </Section>

        {/* Editable: emergency contact */}
        <Section title="Emergency contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contact name" htmlFor="mp-ec-name" error={errors.emergencyContactName}>
              <Input
                id="mp-ec-name"
                value={draft.emergencyContactName}
                onChange={(e) => set("emergencyContactName", e.target.value)}
                maxLength={PEOPLE_TEXT_LIMITS.NAME}
              />
            </FormField>
            <FormField label="Contact number" error={errors.contact ?? errors.emergencyContactNumber}>
              <PhoneInput
                value={draft.emergencyContactNumber}
                onChange={(value) => set("emergencyContactNumber", value)}
                error={Boolean(errors.contact || errors.emergencyContactNumber)}
              />
            </FormField>
          </div>
        </Section>

        {/* Read-only: employment (HR-controlled) */}
        <Section title="Employment details">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-5 sm:grid-cols-2">
            <ReadOnlyRow label="Company email" value={profile.companyEmail} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Status</span>
              <span>
                <StatusBadge status={profile.status} dot />
              </span>
            </div>
            <ReadOnlyRow label="Department" value={profile.department || "—"} />
            <ReadOnlyRow label="Job title" value={profile.jobTitle || "—"} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Supervisor</span>
              {profile.supervisor ? (
                <button
                  type="button"
                  onClick={() => setSupervisorOpen(true)}
                  aria-label={`View ${profile.supervisor.fullName}'s profile`}
                  title="View supervisor's profile"
                  className="group inline-flex w-fit items-center gap-1 rounded text-left text-sm font-medium text-[color:var(--text-primary)] underline decoration-dotted decoration-[color:var(--text-quaternary)] underline-offset-4 transition-colors hover:decoration-solid hover:decoration-[color:var(--brand-pink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {profile.supervisor.fullName}
                  <ChevronRight
                    className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <span className="text-sm text-[color:var(--text-primary)]">None</span>
              )}
            </div>
            <ReadOnlyRow
              label="Team/s"
              value={profile.teams.length ? profile.teams.map((t) => t.name).join(", ") : "Unassigned"}
            />
          </div>
          <p className="text-xs text-[color:var(--text-tertiary)]">
            Work details are managed by HR. Contact them if any of these are incorrect.
          </p>
        </Section>

        {/* Read-only: custom fields */}
        {profile.customFields !== undefined && profile.customFields.length > 0 && (
          <Section title="Custom fields">
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--bg-secondary)] p-5 sm:grid-cols-2">
              {profile.customFields.map((field) => {
                const answer = field.value?.trim();
                return (
                  <ReadOnlyRow
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
              })}
            </div>
          </Section>
        )}

        {/* Read-only: activity history */}
        <Section title="Activity history">
          <ProfileActivityHistory logs={activityLogs} loading={activityLoading} />
        </Section>
      </div>

      {/* Sticky save/discard footer — only when there are unsaved edits */}
      {dirty && (
        <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-[color:var(--border-primary)] bg-white px-8 py-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => {
              setDraft(baseline);
              setErrors({});
            }}
          >
            Discard
          </Button>
          <Button type="button" size="sm" loading={saving} onClick={() => void handleSave()}>
            {!saving && <Check aria-hidden="true" />} {saving ? "Saving…" : "Save changes"}
          </Button>
        </footer>
      )}

      <RedactedProfileSheet
        employeeId={supervisorOpen ? (profile.supervisor?.id ?? null) : null}
        open={supervisorOpen}
        onOpenChange={setSupervisorOpen}
      />
    </>
  );
}
