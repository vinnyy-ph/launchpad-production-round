"use client";

import { type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui";
import { StatusBadge } from "@/shared/ui/patterns";
import { useEmployeeProfile } from "../hooks/use-employee-profile";
import type { EmployeeListItem, EmployeeProfile } from "../types/employees.types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/** A single label/value line in the drawer. */
function SheetField({
  label,
  value,
  className = "",
  children,
}: {
  label: string;
  value?: string | null;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      {children ?? <span className="text-sm text-[color:var(--text-primary)]">{value || "—"}</span>}
    </div>
  );
}

/** Joins the non-empty parts of an address into a single readable line. */
function formatAddress(address: EmployeeProfile["address"]): string {
  if (!address) return "";
  return [address.address, address.city, address.province, address.country]
    .filter(Boolean)
    .join(", ");
}

/** Formats an ISO birthday string for display; returns "—" when missing/invalid. */
function formatBirthday(birthday: string | null | undefined): string {
  if (!birthday) return "—";
  try {
    return format(parseISO(birthday), "MMMM d, yyyy");
  } catch {
    return birthday;
  }
}

export interface EmployeeProfileSheetProps {
  /** Profile to load; null keeps the drawer closed. */
  employeeId: string | null;
  /** List row for the clicked person, shown immediately while the full profile loads. */
  fallbackEmployee: EmployeeListItem | null;
  onClose: () => void;
  /**
   * Portal target for the drawer. Omit (or pass null) to render into `document.body`. Pass an
   * element only when the drawer must live inside it — e.g. a fullscreen canvas in the top layer.
   */
  container?: HTMLElement | null;
}

/**
 * Right-side employee detail drawer. Fetches the role-aware profile so HR, admins, and the person
 * themselves see every field, while any other viewer receives a profile with the sensitive fields
 * (personal email, birthday, address, emergency contact) omitted by the backend — so those sections
 * are simply not rendered. The clicked list row is shown first as an instant identity fallback.
 *
 * Because the redaction decision is the server's, the same drawer is safe to reuse wherever an
 * employee can be opened (the HR org chart, the supervisor roster, etc.).
 */
export function EmployeeProfileSheet({
  employeeId,
  fallbackEmployee,
  onClose,
  container,
}: EmployeeProfileSheetProps) {
  const { employee, loading } = useEmployeeProfile(employeeId);
  // Prefer the fetched profile; fall back to the clicked list row so identity shows instantly.
  const profile = employee ?? fallbackEmployee;

  // Sensitive fields exist on the response only when the viewer is allowed to see them. Their
  // presence — not their value — is the permission signal, so an empty-but-present field still
  // renders ("—") for HR while a redacted viewer never sees the section at all.
  const details = employee;
  const canSeePersonalEmail = !!details && "personalEmail" in details;
  const canSeeBirthday = !!details && "birthday" in details;
  const address = details?.address;
  const emergencyContact = details?.emergencyContact;
  const showAddress = !!address && formatAddress(address).length > 0;
  const showEmergencyContact =
    !!emergencyContact &&
    Boolean(emergencyContact.emergencyContactName || emergencyContact.emergencyContactNumber);

  return (
    <Sheet open={!!employeeId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md" container={container}>
        {profile && (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
                  }}
                  aria-hidden="true"
                >
                  {initials(profile.fullName)}
                </span>
                <div>
                  <SheetTitle className="text-left text-base font-bold leading-tight text-[color:var(--text-primary)]">
                    {profile.fullName}
                  </SheetTitle>
                  <SheetDescription className="text-left text-sm text-[color:var(--text-secondary)]">
                    {profile.jobTitle ?? "—"}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div
              className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <SheetField label="Department" value={profile.department} />
              <SheetField label="Status">
                <StatusBadge status={profile.status} dot />
              </SheetField>
              <SheetField label="Supervisor" value={profile.supervisor?.fullName} />
              <SheetField label="Team/s" value={profile.teams.map((team) => team.name).join(", ")} />
              <SheetField label="Company email" value={profile.companyEmail} className="col-span-2" />

              {canSeePersonalEmail ? (
                <SheetField
                  label="Personal email"
                  value={details?.personalEmail}
                  className="col-span-2"
                />
              ) : null}
              {canSeeBirthday ? (
                <SheetField label="Birthday" value={formatBirthday(details?.birthday)} />
              ) : null}
              {showAddress ? (
                <SheetField label="Address" value={formatAddress(address)} className="col-span-2" />
              ) : null}
              {showEmergencyContact ? (
                <>
                  <SheetField
                    label="Emergency contact"
                    value={emergencyContact?.emergencyContactName}
                  />
                  <SheetField
                    label="Contact number"
                    value={emergencyContact?.emergencyContactNumber}
                  />
                </>
              ) : null}
            </div>

            {loading && !employee ? (
              <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">Loading full profile…</p>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
