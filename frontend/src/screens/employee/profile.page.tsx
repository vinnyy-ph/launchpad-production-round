"use client";

import { AlertCircle } from "lucide-react";

import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useEmployeeProfile } from "@/modules/people/employees/hooks/use-employee-profile";
import type { EmployeeProfile } from "@/modules/people/employees/types/employees.types";

import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { StatusBadge } from "@/shared/ui/patterns";
import { PageSection } from "@/shared/ui/patterns";
import { PageHeader } from "@/shared/components/layout/page-header";

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
      <div
        className="space-y-4 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field row (read-only) ────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{label}</span>
      <span className="text-sm text-[color:var(--text-primary)]">{value ?? "—"}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatAddress(profile: EmployeeProfile) {
  const a = profile.address;
  if (!a) return "—";
  const parts = [a.address, a.city, a.province, a.country].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function formatEmergencyContact(profile: EmployeeProfile) {
  const c = profile.emergencyContact;
  if (!c) return "—";
  const parts = [c.emergencyContactName, c.emergencyContactNumber]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId || null;
  const { employee, loading, error, reload } = useEmployeeProfile(employeeId);
  const profile = employee as EmployeeProfile | null;

  if (loading) return <ProfileSkeleton />;

  if (!employeeId) {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">
            No employee record is linked to this account.
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <AlertCircle size={16} className="flex-shrink-0 text-[#D92D20]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{error}</span>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="My profile" />

      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 select-none items-center justify-center rounded-full text-lg font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))",
          }}
          aria-hidden="true"
        >
          {initials(profile.fullName)}
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight text-[color:var(--text-primary)]">
            {profile.fullName}
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)]">{profile.jobTitle || "—"}</p>
          <div className="mt-1">
            <StatusBadge status={profile.status} dot />
          </div>
        </div>
      </div>

      {/* Work info */}
      <PageSection title="Work information">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label="Department" value={profile.department || "—"} />
            <FieldRow label="Job title" value={profile.jobTitle || "—"} />
            <FieldRow label="Supervisor" value={profile.supervisor?.fullName ?? "None"} />
            <FieldRow
              label="Team/s"
              value={profile.teams.length ? profile.teams.map((t) => t.name).join(", ") : "Unassigned"}
            />
          </div>
        </div>
      </PageSection>

      {/* Contact information (read-only) */}
      <PageSection title="Contact information">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label="Company email" value={profile.companyEmail} />
            <FieldRow label="Personal email" value={profile.personalEmail || "—"} />
          </div>
        </div>
      </PageSection>

      {/* Personal information (self sees full) */}
      <PageSection title="Personal information">
        <div
          className="rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldRow label="Date of birth" value={formatDate(profile.birthday)} />
            <FieldRow label="Home address" value={formatAddress(profile)} />
            <FieldRow label="Emergency contact" value={formatEmergencyContact(profile)} />
          </div>
        </div>
      </PageSection>
    </div>
  );
}
