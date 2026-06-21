"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusBadge,
} from "@/shared/ui";
import { useEmployeeProfile } from "../hooks/use-employee-profile";
import type { EmployeeProfile } from "../types/employees.types";

interface RedactedProfileSheetProps {
  /** Employee whose profile to show. The sheet only fetches while open. */
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

/**
 * Read-only employee profile drawer for non-HR viewers (e.g. teammates and team leaders).
 *
 * Reads the profile through the redaction-aware endpoint: HR/Admin and the employee themselves
 * receive the full record, while everyone else gets a redacted one with sensitive fields omitted.
 * The sensitive section is therefore rendered only when those fields are present in the payload,
 * so a teammate's view hides them automatically while a self/HR view still shows them.
 */
export function RedactedProfileSheet({ employeeId, open, onOpenChange }: RedactedProfileSheetProps) {
  const { employee, loading, error } = useEmployeeProfile(open ? employeeId : null);
  const profile = employee as EmployeeProfile | null;

  const showSensitive = Boolean(
    profile?.personalEmail || profile?.birthday || profile?.address || profile?.emergencyContact,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
              }}
              aria-hidden="true"
            >
              {profile ? initials(profile.fullName) : ""}
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-left text-base font-bold leading-tight text-[color:var(--text-primary)]">
                {profile?.fullName ?? "Profile"}
              </SheetTitle>
              <SheetDescription className="text-left text-sm text-[color:var(--text-secondary)]">
                {profile?.jobTitle ?? (loading ? "Loading…" : "—")}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : error ? (
          <p className="text-sm text-[color:var(--text-secondary)]">
            We couldn&apos;t load this profile. Please try again.
          </p>
        ) : profile ? (
          <>
            <div className="space-y-4">
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <Field label="Department" value={profile.department ?? "—"} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Status</span>
                  <StatusBadge status={profile.status} dot />
                </div>
                <Field label="Supervisor" value={profile.supervisor?.fullName ?? "—"} />
                <Field
                  label="Team/s"
                  value={profile.teams.length ? profile.teams.map((t) => t.name).join(", ") : "—"}
                />
                <div className="col-span-2">
                  <Field label="Company email" value={profile.companyEmail} />
                </div>
              </div>

              {showSensitive ? (
                <div
                  className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="col-span-2">
                    <Field label="Personal email" value={profile.personalEmail || "—"} />
                  </div>
                  <Field label="Date of birth" value={formatDate(profile.birthday)} />
                  <div className="col-span-2">
                    <Field label="Home address" value={formatAddress(profile)} />
                  </div>
                  <div className="col-span-2">
                    <Field label="Emergency contact" value={formatEmergencyContact(profile)} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[color:var(--text-tertiary)]">
                  Personal details (birthday, home address, emergency contact) are visible only to
                  HR, Admin, and the employee themselves.
                </p>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
