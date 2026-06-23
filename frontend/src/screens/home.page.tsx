// frontend/src/screens/home.page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  RefreshCw,
  Bell,
  UserPlus,
  UserMinus,
  Users,
  ShieldCheck,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
  FileText,
  FileCheck2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { useDashboard, type DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import { useNotifications } from "@/modules/notifications/hooks/use-notifications";
import { useMarkRead } from "@/modules/notifications/hooks/use-mark-read";
import { NotificationItem } from "@/modules/notifications/components/notification-item";
import { KpiCard, type KpiCardProps } from "@/shared/ui/patterns";
import { cn } from "@/shared/lib/utils";
import type { AppUser, EmployeeStatus } from "@/modules/auth/types/auth.types";

export default function HomePage() {
  const { appUser } = useAuth();
  const { stats, loading: statsLoading, error: statsError, reload: loadStats } = useDashboard();

  const { notifications, loading: notifLoading, error: notifError, reload: reloadNotifs } = useNotifications(5);
  const { markRead } = useMarkRead(() => void reloadNotifs());

  // Time-aware greeting is set after mount so the server-prerendered HTML and the
  // client hydration agree (the clock only exists on the client). First paint shows
  // the neutral fallback, then the greeting resolves to morning/afternoon/evening.
  const [greeting, setGreeting] = useState("Welcome back");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
    setDateLabel(now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const firstName = getFirstName(appUser);
  const summary = buildSummary(appUser?.role, appUser?.isSupervisor, stats);
  const sections = buildSections(appUser?.role, appUser?.isSupervisor, appUser?.employeeStatus, stats);

  // Personal employee-lane to-dos surfaced as hero CTAs — every role holds the employee lane,
  // so these deep-link the same way for employee, supervisor, HR, and admin.
  const heroActions: { label: string; href: string }[] = [];
  if (stats?.unreadSurveys) {
    heroActions.push({
      label: stats.unreadSurveys === 1 ? "Answer survey" : "Answer surveys",
      href: "/employee/surveys",
    });
  }
  if (stats?.pendingAcknowledgements) {
    heroActions.push({
      label: stats.pendingAcknowledgements === 1 ? "Review evaluation" : "Review evaluations",
      href: "/employee/surveys?tab=acknowledgements",
    });
  }

  return (
    <div className="min-w-0 space-y-7">
      {/* Greeting hero — the single Jia gradient moment on this surface. Bright gradient with
          cool-black text (AA-safe on the light pastel stops); the one sanctioned gradient use. */}
      <div
        className="rounded-[24px] px-6 py-7 sm:px-8 sm:py-8"
        style={{ background: "var(--gradient-jia)", boxShadow: "var(--shadow-inset-brand)" }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)]">
          {dateLabel ? `${dateLabel} ✦` : "✦"}
        </p>
        <h1 className="mt-2.5 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-primary)] sm:text-[32px]">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm font-medium text-[color:var(--text-secondary)]">{summary}</p>
        {heroActions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2.5">
            {heroActions.map((action, i) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--text-primary)]",
                  i === 0
                    ? "bg-[color:var(--text-primary)] text-white shadow-sm hover:bg-[color:var(--gray-800)]"
                    : "bg-white/80 text-[color:var(--text-primary)] hover:bg-white",
                )}
              >
                {action.label}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* At a glance — one section per hat the user holds (Your work → Your team →
          Organization). Each card links to where the metric is acted on. */}
      {statsError ? (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border-primary)] bg-white p-4">
          <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
          <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{statsError}</span>
          <button
            onClick={() => void loadStats()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--bg-secondary)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.key}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
              {section.title}
            </h2>
            <div className={cn("grid gap-4", GRID_COLS[section.cols])}>
              {section.cards.map((card) => (
                <KpiCard key={card.label} {...card} loading={statsLoading} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Recent notifications */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
          Recent notifications
        </h2>
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--border-primary)] bg-white"
          style={{ boxShadow: "var(--shadow-xs)" }}
        >
          {notifLoading ? (
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3 border-b border-[color:var(--border-primary)] last:border-0">
                  <div className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[color:var(--bg-tertiary)]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-[color:var(--bg-tertiary)]" />
                    <div className="h-2.5 w-1/2 rounded bg-[color:var(--bg-tertiary)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifError ? (
            <div className="flex items-center gap-3 p-4">
              <AlertCircle size={16} className="flex-shrink-0 text-[color:var(--color-error-500)]" />
              <span className="flex-1 text-sm text-[color:var(--text-secondary)]">{notifError}</span>
              <button
                onClick={() => void reloadNotifs()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Bell size={20} className="text-[color:var(--text-quaternary)]" />
              <p className="text-sm text-[color:var(--text-tertiary)]">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border-primary)]">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={markRead} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface DashSection {
  key: string;
  title: string;
  cards: KpiCardProps[];
  /** How many columns the metric grid uses at desktop width. */
  cols: 2 | 3 | 4;
}

/** Tailwind column classes per section width — keeps a 2-card lane from stranding in a 4-up grid. */
const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

/** First name for the greeting: first token of the display name, else the email local part. */
function getFirstName(user: AppUser | null | undefined): string {
  const fromName = user?.displayName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = user?.email?.split("@")[0];
  return local ?? "";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Join clauses naturally: "a", "a and b", "a, b and c". */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * A plain-language line of what's waiting, aggregated across every hat the user holds
 * (personal → team → org). Capped at three clauses so it never becomes a run-on.
 */
function buildSummary(
  role: string | undefined,
  isSupervisor: boolean | undefined,
  stats: DashboardStats | null,
): string {
  if (!stats) return "Here's your day at a glance.";

  const clauses: string[] = [];
  // Personal (the Employee lane everyone holds).
  if (stats.unreadSurveys) clauses.push(`${plural(stats.unreadSurveys, "survey")} to answer`);
  if (stats.pendingAcknowledgements) clauses.push(`${plural(stats.pendingAcknowledgements, "evaluation")} to acknowledge`);
  // Team (Supervisor lane).
  if (isSupervisor && stats.pendingEvaluations) clauses.push(`${plural(stats.pendingEvaluations, "evaluation")} to finish`);
  // Organization (HR / Admin lane).
  if (role === "HR" || role === "ADMIN") {
    if (stats.pendingOnboarding) clauses.push(`${stats.pendingOnboarding} ${stats.pendingOnboarding === 1 ? "person" : "people"} onboarding`);
    if (stats.pendingOffboarding) clauses.push(`${stats.pendingOffboarding} ${stats.pendingOffboarding === 1 ? "person" : "people"} offboarding`);
    if (stats.pendingClearances) clauses.push(`${plural(stats.pendingClearances, "clearance")} to sign`);
  }

  if (clauses.length === 0) return "You're all caught up — nice work.";
  if (clauses.length <= 3) return `You have ${joinClauses(clauses)}.`;
  return `You have ${joinClauses(clauses.slice(0, 2))}, and ${clauses.length - 2} more things to review.`;
}

/**
 * The KPI sections to show, one per hat the user holds, in fixed order:
 * Your work (every employee) → Your team (supervisors) → Organization (HR/Admin).
 * Mirrors the additive sidebar so the dashboard never hides a lane the user has.
 */
function buildSections(
  role: string | undefined,
  isSupervisor: boolean | undefined,
  employeeStatus: EmployeeStatus | undefined,
  stats: DashboardStats | null,
): DashSection[] {
  // While stats are loading the value is ignored (the card shows a skeleton);
  // once loaded, an absent metric falls back to "—".
  const num = (n: number | undefined): string | number => (stats ? (n ?? "—") : 0);
  const sections: DashSection[] = [];

  // Your work — the caller's own to-dos. Onboarding figures only matter while onboarding.
  const work: KpiCardProps[] = [
    { icon: MessageSquare, label: "Surveys to answer", value: num(stats?.unreadSurveys), href: "/employee/surveys", period: "Pulse check-ins" },
    { icon: FileCheck2, label: "Evaluations to acknowledge", value: num(stats?.pendingAcknowledgements), href: "/employee/surveys?tab=acknowledgements", period: "From your supervisor" },
  ];
  if (employeeStatus === "ONBOARDING") {
    work.push(
      { icon: FileText, label: "Documents pending", value: num(stats?.pendingDocuments), href: "/employee/onboarding" },
      {
        icon: TrendingUp,
        label: "Onboarding progress",
        value: stats ? (stats.onboardingProgress != null ? `${stats.onboardingProgress}%` : "—") : 0,
        href: "/employee/onboarding",
      },
    );
  }
  sections.push({ key: "work", title: "Your work", cards: work, cols: 2 });

  // Your team — supervisors only.
  if (isSupervisor) {
    sections.push({
      key: "team",
      title: "Your team",
      cols: 3,
      cards: [
        { icon: ClipboardCheck, label: "Pending evaluations", value: num(stats?.pendingEvaluations), href: "/supervisor/evaluations" },
        { icon: Users, label: "Direct reports", value: num(stats?.directReports), href: "/supervisor/roster" },
        {
          icon: CheckCircle2,
          label: "Evals complete",
          value: stats
            ? stats.totalEvaluations
              ? `${stats.completedEvaluations ?? 0}/${stats.totalEvaluations}`
              : "—"
            : 0,
          href: "/supervisor/evaluations",
        },
      ],
    });
  }

  // Organization — HR / Admin only.
  if (role === "HR" || role === "ADMIN") {
    sections.push({
      key: "org",
      title: "Organization",
      cols: 4,
      cards: [
        { icon: UserPlus, label: "Pending onboarding", value: num(stats?.pendingOnboarding), href: "/hr/directory/onboarding" },
        { icon: UserMinus, label: "Pending offboarding", value: num(stats?.pendingOffboarding), href: "/hr/directory/offboarding" },
        { icon: Users, label: "Active employees", value: num(stats?.activeEmployees), href: "/hr/directory" },
        { icon: ShieldCheck, label: "Clearance awaiting", value: num(stats?.pendingClearances), href: "/hr/directory/offboarding" },
      ],
    });
  }

  return sections;
}
