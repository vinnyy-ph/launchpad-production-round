// frontend/src/screens/home.page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  Users,
  ClipboardCheck,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useDashboard, type DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import { useAssignedClearances, AssignedClearancesSection } from "@/modules/people/offboarding";
import { KpiCard } from "@/shared/ui/patterns";
import { Button, Skeleton } from "@/shared/ui";
import { UserAvatar } from "@/shared/ui/primitives/user-avatar";
import { RedactedProfileSheet } from "@/modules/people/employees/components/redacted-profile-sheet";
import { cn } from "@/shared/lib/utils";
import { useMyTeams } from "@/modules/people/teams/hooks/use-my-teams";
import type { Team } from "@/modules/people/teams/types/teams.types";
import {
  getFirstName,
  buildSummary,
  buildDashboardAttention,
  dashboardPrimaryAction,
  buildGlanceCards,
  type DashAttentionItem,
} from "./home.logic";

// Glance-card id → icon. The logic stays icon-free; the page owns the visual mapping.
const GLANCE_ICONS: Record<string, LucideIcon> = {
  "onboarding-progress": TrendingUp,
  "direct-reports": Users,
  "evals-complete": ClipboardCheck,
  "active-employees": Users,
};

export default function HomePage() {
  const { appUser } = useAuth();
  const { stats, loading: statsLoading, error: statsError, reload: loadStats } = useDashboard();

  // Clearances the signed-in user must sign — surfaced only when something is pending.
  const { clearances: assignedClearances } = useAssignedClearances(Boolean(appUser?.employeeId));
  const hasPendingSignatures = assignedClearances.some((c) => c.status === "PENDING");

  // Teams the caller belongs to — shown in the "Your team" people section.
  const { teams: myTeams, loading: teamsLoading } = useMyTeams(appUser?.employeeId || undefined);

  // Time-aware greeting is set after mount so the server-prerendered HTML and the client
  // hydration agree (the clock only exists on the client). First paint shows the neutral
  // fallback, then it resolves to morning/afternoon/evening.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const firstName = getFirstName(appUser);
  const attention = buildDashboardAttention({
    role: appUser?.role,
    isSupervisor: appUser?.isSupervisor,
    employeeStatus: appUser?.employeeStatus,
    stats,
  });
  const primary = dashboardPrimaryAction(attention);
  const summary = buildSummary(attention.length, stats != null);
  const glance = buildGlanceCards({
    role: appUser?.role,
    isSupervisor: appUser?.isSupervisor,
    employeeStatus: appUser?.employeeStatus,
    stats,
  });

  return (
    <div className="min-w-0 space-y-7">
      {/* Greeting hero — the single Jia gradient moment, with the top action as a primary CTA. */}
      <div
        className="rounded-[24px] px-6 py-7 sm:px-8 sm:py-8"
        style={{ background: "var(--gradient-jia)", boxShadow: "var(--shadow-inset-brand)" }}
      >
        <span className="text-base font-bold text-[color:var(--text-secondary)]" aria-hidden="true">✦</span>
        <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-[30px]">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm font-medium text-[color:var(--text-secondary)]">{summary}</p>
        {primary && !statsLoading && (
          <Link
            href={primary.href}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[color:hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            {primary.cta}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>

      {statsError ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{statsError}</span>
          <Button variant="ghost" size="sm" onClick={() => void loadStats()}>
            <RefreshCw /> Retry
          </Button>
        </div>
      ) : (
        <>
          {/* Needs your attention — actionable to-dos across every hat, prioritized. */}
          <AttentionBand items={attention} loading={statsLoading} />

          {/* At a glance — standing context metrics for every hat the user holds. */}
          {(statsLoading || glance.length > 0) && (
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                At a glance
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {statsLoading
                  ? [0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-[116px] rounded-xl border border-[color:var(--border-primary)] bg-white"
                        style={{ boxShadow: "var(--shadow-xs)" }}
                      />
                    ))
                  : glance.map((card) => (
                      <KpiCard
                        key={card.id}
                        icon={GLANCE_ICONS[card.id]}
                        label={card.label}
                        value={card.value}
                        href={card.href}
                        hint={card.hint}
                        progress={card.progress}
                      />
                    ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Clearances awaiting the signed-in user's signature — only when something is pending. */}
      {hasPendingSignatures && (
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            Clearances awaiting my signature
          </h2>
          <AssignedClearancesSection />
        </section>
      )}

      {/* Your team — people-module context: the caller's supervisor + the teams they're on. */}
      <PeopleSection
        supervisor={stats?.supervisor ?? null}
        teams={myTeams}
        loading={statsLoading || teamsLoading}
      />
    </div>
  );
}

// ─── Needs-your-attention band ──────────────────────────────────────────────

function AttentionBand({ items, loading }: { items: DashAttentionItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div
        className="h-[112px] rounded-xl border border-[color:var(--border-primary)] bg-white"
        style={{ boxShadow: "var(--shadow-xs)" }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-5"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <span
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--color-success-50)" }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--color-success-600)" }} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">You&apos;re all caught up</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Nothing needs your attention right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
      style={{ boxShadow: "var(--shadow-xs)" }}
    >
      <div className="flex items-center gap-2 border-b border-[color:var(--border-secondary)] px-5 py-3">
        <AlertCircle size={15} style={{ color: "var(--color-warning-600)" }} />
        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Needs your attention
        </p>
      </div>
      <div className="divide-y divide-[color:var(--border-secondary)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
          >
            <span className="flex-1 text-sm text-[color:var(--text-primary)]">{item.label}</span>
            <span className="hidden flex-shrink-0 text-xs font-semibold text-[color:var(--text-tertiary)] transition-colors group-hover:text-[color:var(--text-secondary)] sm:inline">
              {item.cta}
            </span>
            <ArrowUpRight
              size={15}
              className="flex-shrink-0 text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <UserAvatar
      src={src}
      fallback={initials(name)}
      className={cn("h-9 w-9", className)}
      fallbackClassName="text-[12px] font-bold text-white"
      fallbackStyle={{ background: "linear-gradient(135deg, var(--brand-peach), var(--brand-pink))" }}
    />
  );
}

/**
 * People-module context for the dashboard: who the caller reports to (org-graph supervisor)
 * and the teams they belong to. Renders nothing when the caller has neither.
 */
function PeopleSection({
  supervisor,
  teams,
  loading,
}: {
  supervisor: DashboardStats["supervisor"];
  teams: Team[];
  loading: boolean;
}) {
  const [supervisorOpen, setSupervisorOpen] = useState(false);

  if (!loading && !supervisor && teams.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
        Your team
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && supervisor ? (
          <button
            type="button"
            onClick={() => setSupervisorOpen(true)}
            aria-label={`View ${supervisor.fullName}'s profile`}
            className="group rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 text-left transition-colors hover:border-[color:var(--border-secondary)]"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Your supervisor
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={supervisor.fullName} src={supervisor.avatarUrl} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">
                    {supervisor.fullName}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                    {supervisor.jobTitle ?? "Supervisor"}
                  </p>
                </div>
              </div>
              <ArrowRight
                size={15}
                className="flex-none text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </button>
        ) : (
          <div
            className="rounded-2xl border border-[color:var(--border-primary)] bg-white p-5"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Your supervisor
            </p>
            {loading ? (
              <div className="mt-3 flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--text-tertiary)]">
                You&apos;re at the top of the org chart.
              </p>
            )}
          </div>
        )}

        {teams.map((team) => (
          <Link
            key={team.id}
            href={`/employee/teams/${team.id}`}
            className="group rounded-2xl border border-[color:var(--border-primary)] bg-white p-5 transition-colors hover:border-[color:var(--border-secondary)]"
            style={{ boxShadow: "var(--shadow-xs)" }}
          >
            <p className="text-[12px] font-bold uppercase tracking-wider text-[color:var(--text-quaternary)]">
              Team
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{team.name}</p>
                <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                  {team.memberCount} {team.memberCount === 1 ? "member" : "members"} · Led by{" "}
                  {team.leader.fullName}
                </p>
              </div>
              <ArrowRight
                size={15}
                className="flex-none text-[color:var(--text-quaternary)] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </Link>
        ))}
      </div>

      <RedactedProfileSheet
        employeeId={supervisorOpen ? (supervisor?.id ?? null) : null}
        open={supervisorOpen}
        onOpenChange={setSupervisorOpen}
      />
    </section>
  );
}
