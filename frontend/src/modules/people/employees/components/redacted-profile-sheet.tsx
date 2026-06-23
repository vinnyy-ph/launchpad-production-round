"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusBadge,
  UserAvatar,
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

/**
 * Read-only employee profile drawer for team-context surfaces (teammates and team leaders).
 *
 * Sensitive fields (personal email, birthday, home address, emergency contact) are ALWAYS hidden
 * here — even for an HR viewer. This is intentional: HR's unredacted view is exposed only in the
 * People directory and the structure org chart, while the teams view stays redacted for everyone.
 * Shows identity, work, team, and supervisor data only.
 */
export function RedactedProfileSheet({ employeeId, open, onOpenChange }: RedactedProfileSheetProps) {
  const { employee, loading, error } = useEmployeeProfile(open ? employeeId : null);
  const profile = employee as EmployeeProfile | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={profile?.avatarUrl}
              fallback={profile ? initials(profile.fullName) : ""}
              className="h-12 w-12"
              fallbackClassName="text-sm font-bold text-white"
              fallbackStyle={{
                background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
              }}
            />
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
                  <StatusBadge status={profile.status} dot className="w-fit" />
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
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
