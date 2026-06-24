"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  PhoneInput,
} from "@/shared/ui";
import { DatePicker } from "@/shared/ui/primitives/date-picker";
import { PhAddressFields } from "@/shared/ui/patterns/ph-address-fields";
import { isStrictPhilippineMobile, toPhilippineE164 } from "@/shared/lib/phone";
import { PEOPLE_TEXT_LIMITS, validatePeopleText } from "@/modules/people/people-text";
import { useUpdateMyProfile } from "../hooks/use-update-my-profile";
import type { EmployeeProfile, MyProfileUpdateInput } from "../types/employees.types";

interface EditMyProfileDialogProps {
  /** The signed-in employee's own profile, used to seed the form. */
  profile: EmployeeProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** PH-only deployment: the address country is fixed to the Philippines. */
const PH_COUNTRY = "Philippines";
const LETTERS_ONLY_RE = /^[A-Za-z\s]+$/;
const STREET_ADDRESS_RE = /^[A-Za-z0-9\s.,#'’/&()-]+$/;

const PROFILE_FIELD_MESSAGES: Partial<Record<keyof Draft | "contact", string>> = {
  firstName: "Please enter a valid first name using letters only.",
  middleName: "Please enter a valid middle name using letters only.",
  lastName: "Please enter a valid last name using letters only.",
  personalEmail: "Please enter a valid personal email address.",
  address:
    "Please enter a valid street address using letters, numbers, and standard address characters only.",
  emergencyContactName: "Please enter a valid contact name using letters only.",
  contact: "Enter an 11-digit mobile number starting with 09.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    // The API returns birthday as a full ISO datetime; keep only the date portion for the field.
    birthday: profile.birthday ? profile.birthday.slice(0, 10) : "",
    country: profile.address?.country?.trim() || PH_COUNTRY,
    province: profile.address?.province ?? "",
    city: profile.address?.city ?? "",
    address: profile.address?.address ?? "",
    emergencyContactName: profile.emergencyContact?.emergencyContactName ?? "",
    emergencyContactNumber: toPhilippineE164(profile.emergencyContact?.emergencyContactNumber ?? ""),
  };
}

function nullableTrim(value: string): string | null {
  return value.trim() || null;
}

function validateProfileField(field: keyof Draft | "contact", value: string): string | undefined {
  const trimmed = value.trim();

  if (field === "firstName") {
    return !trimmed ||
      !LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "First name", PEOPLE_TEXT_LIMITS.NAME)
      ? PROFILE_FIELD_MESSAGES.firstName
      : undefined;
  }

  if (field === "middleName") {
    return trimmed &&
      (!LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Middle name", PEOPLE_TEXT_LIMITS.NAME))
      ? PROFILE_FIELD_MESSAGES.middleName
      : undefined;
  }

  if (field === "lastName") {
    return !trimmed ||
      !LETTERS_ONLY_RE.test(trimmed) ||
      validatePeopleText(trimmed, "Last name", PEOPLE_TEXT_LIMITS.NAME)
      ? PROFILE_FIELD_MESSAGES.lastName
      : undefined;
  }

  if (field === "personalEmail") {
    return trimmed &&
      (!EMAIL_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Personal email", PEOPLE_TEXT_LIMITS.EMAIL))
      ? PROFILE_FIELD_MESSAGES.personalEmail
      : undefined;
  }

  if (field === "address") {
    return trimmed &&
      (!STREET_ADDRESS_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Street address", PEOPLE_TEXT_LIMITS.ADDRESS_LINE))
      ? PROFILE_FIELD_MESSAGES.address
      : undefined;
  }

  if (field === "emergencyContactName") {
    return trimmed &&
      (!LETTERS_ONLY_RE.test(trimmed) ||
        validatePeopleText(trimmed, "Emergency contact name", PEOPLE_TEXT_LIMITS.NAME))
      ? PROFILE_FIELD_MESSAGES.emergencyContactName
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

/**
 * Self-service edit dialog for the employee's own profile. Edits names, personal email, birthday,
 * home address, and emergency contact only — work fields (company email, job title, department,
 * supervisor, status) are HR-controlled and intentionally excluded.
 */
export function EditMyProfileDialog({ profile, open, onOpenChange }: EditMyProfileDialogProps) {
  const { update, saving } = useUpdateMyProfile(profile.id);
  const [draft, setDraft] = useState<Draft>(() => draftFromProfile(profile));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft | "contact", string>>>({});

  // Re-seed the form each time it opens so a cancelled edit never leaks into the next open.
  useEffect(() => {
    if (open) {
      setDraft(draftFromProfile(profile));
      setErrors({});
    }
  }, [open, profile]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      const error = validateProfileField(key, String(value));
      if (error) next[key] = error;
      else delete next[key];
      if (key === "emergencyContactNumber") {
        delete next.contact;
      }
      return next;
    });
  }

  async function handleSave() {
    const next: typeof errors = {};
    for (const field of Object.keys(draft) as (keyof Draft)[]) {
      const error = validateProfileField(field, draft[field]);
      if (error) next[field] = error;
    }
    const contact = draft.emergencyContactNumber.trim();
    if (contact && !isStrictPhilippineMobile(contact)) {
      next.contact = PROFILE_FIELD_MESSAGES.contact;
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
      toast.success("Profile updated.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update your profile.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your personal details. Work details like your job title and supervisor are
            managed by HR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Name */}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="First name" htmlFor="mp-first" required error={errors.firstName}>
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
            <FormField label="Last name" htmlFor="mp-last" required error={errors.lastName}>
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
            <FormField label="Date of birth">
              <DatePicker
                disableFuture
                value={draft.birthday ? new Date(`${draft.birthday}T00:00:00`) : undefined}
                onChange={(next) => set("birthday", next ? format(next, "yyyy-MM-dd") : "")}
                className="w-full"
              />
            </FormField>
          </div>

          {/* Address */}
          <div>
            <p className="mb-3 text-xs uppercase font-bold text-[color:var(--text-primary)]">Home address</p>
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
                setDraft((current) => ({ ...current, ...patch }));
                setErrors((current) => {
                  const next = { ...current };
                  for (const key of Object.keys(patch) as Array<
                    Extract<keyof Draft, "country" | "province" | "city" | "address">
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

          {/* Emergency contact */}
          <div>
            <p className="mb-3 text-xs uppercase font-bold text-[color:var(--text-primary)]">
              Emergency contact
            </p>
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
                  onChange={(value) => {
                    set("emergencyContactNumber", value);
                  }}
                  error={Boolean(errors.contact || errors.emergencyContactNumber)}
                />
              </FormField>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
