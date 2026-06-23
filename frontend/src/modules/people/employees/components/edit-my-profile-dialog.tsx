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
import { isStrictPhilippineMobile } from "@/shared/lib/phone";
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
    emergencyContactNumber: profile.emergencyContact?.emergencyContactNumber ?? "",
  };
}

function nullableTrim(value: string): string | null {
  return value.trim() || null;
}

/**
 * Self-service edit dialog for the employee's own profile. Edits names, personal email, birthday,
 * home address, and emergency contact only — work fields (company email, job title, department,
 * supervisor, status) are HR-controlled and intentionally excluded.
 */
export function EditMyProfileDialog({ profile, open, onOpenChange }: EditMyProfileDialogProps) {
  const { update, saving } = useUpdateMyProfile(profile.id);
  const [draft, setDraft] = useState<Draft>(() => draftFromProfile(profile));
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; contact?: string }>(
    {},
  );

  // Re-seed the form each time it opens so a cancelled edit never leaks into the next open.
  useEffect(() => {
    if (open) {
      setDraft(draftFromProfile(profile));
      setErrors({});
    }
  }, [open, profile]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const next: typeof errors = {};
    if (!draft.firstName.trim()) next.firstName = "First name is required.";
    if (!draft.lastName.trim()) next.lastName = "Last name is required.";
    const contact = draft.emergencyContactNumber.trim();
    if (contact && !isStrictPhilippineMobile(contact)) {
      next.contact = "Enter an 11-digit mobile number starting with 09.";
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
              />
            </FormField>
            <FormField label="Middle name" htmlFor="mp-middle">
              <Input
                id="mp-middle"
                value={draft.middleName}
                onChange={(e) => set("middleName", e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Last name" htmlFor="mp-last" required error={errors.lastName}>
              <Input
                id="mp-last"
                value={draft.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Personal email" htmlFor="mp-personal-email">
              <Input
                id="mp-personal-email"
                type="email"
                value={draft.personalEmail}
                onChange={(e) => set("personalEmail", e.target.value)}
                placeholder="you@example.com"
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
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            />
          </div>

          {/* Emergency contact */}
          <div>
            <p className="mb-3 text-xs uppercase font-bold text-[color:var(--text-primary)]">
              Emergency contact
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contact name" htmlFor="mp-ec-name">
                <Input
                  id="mp-ec-name"
                  value={draft.emergencyContactName}
                  onChange={(e) => set("emergencyContactName", e.target.value)}
                />
              </FormField>
              <FormField label="Contact number" error={errors.contact}>
                <PhoneInput
                  value={draft.emergencyContactNumber}
                  onChange={(value) => {
                    set("emergencyContactNumber", value);
                    if (errors.contact) setErrors((c) => ({ ...c, contact: undefined }));
                  }}
                  error={Boolean(errors.contact)}
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
