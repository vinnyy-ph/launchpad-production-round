import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser, EmployeeStatus } from "@/modules/auth/types/auth.types";

/** First name for the greeting: first token of the display name, else the email local part. */
export function getFirstName(user: AppUser | null | undefined): string {
  const fromName = user?.displayName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = user?.email?.split("@")[0];
  return local ?? "";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** People count, e.g. "1 person" / "3 people". */
function people(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

/**
 * A friendly one-line hero summary. It reports HOW MANY things need attention without re-listing
 * them — the actionable rows themselves live in the "Needs your attention" band below, so the hero
 * stays a summary instead of duplicating the list. `itemCount` is the band's item count.
 */
export function buildSummary(itemCount: number, statsPresent: boolean): string {
  if (!statsPresent) return "Here's your day at a glance.";
  if (itemCount === 0) return "You're all caught up — nice work.";
  return `You have ${itemCount} thing${itemCount === 1 ? "" : "s"} to review today.`;
}

/** A prioritized, clickable to-do surfaced in the attention band. `cta` is the hero button verb. */
export interface DashAttentionItem {
  id: string;
  count: number;
  label: string;
  cta: string;
  href: string;
}

/**
 * Actionable to-dos across every hat the user holds, prioritized personal → team → org, only
 * including non-zero counts. Empty = all caught up. Stats absent → empty (the band shows loading).
 */
export function buildDashboardAttention(input: {
  role: string | undefined;
  isSupervisor: boolean | undefined;
  employeeStatus: EmployeeStatus | undefined;
  stats: DashboardStats | null;
}): DashAttentionItem[] {
  const { role, isSupervisor, employeeStatus, stats } = input;
  if (!stats) return [];
  const items: DashAttentionItem[] = [];

  // Personal — the Employee lane everyone holds.
  if (stats.pendingAcknowledgements) {
    items.push({ id: "acks", count: stats.pendingAcknowledgements, label: `${plural(stats.pendingAcknowledgements, "evaluation")} to acknowledge`, cta: "Acknowledge now", href: "/employee/surveys?tab=acknowledgements" });
  }
  if (stats.unreadSurveys) {
    items.push({ id: "surveys", count: stats.unreadSurveys, label: `${plural(stats.unreadSurveys, "pulse survey")} to answer`, cta: "Answer surveys", href: "/employee/surveys" });
  }
  if (employeeStatus === "ONBOARDING" && stats.pendingDocuments) {
    items.push({ id: "documents", count: stats.pendingDocuments, label: `${plural(stats.pendingDocuments, "onboarding document")} to submit`, cta: "Submit documents", href: "/employee/onboarding" });
  }
  // Team — Supervisor lane.
  if (isSupervisor && stats.pendingEvaluations) {
    items.push({ id: "drafts", count: stats.pendingEvaluations, label: `${plural(stats.pendingEvaluations, "evaluation draft")} to finish`, cta: "Finish drafts", href: "/supervisor/evaluations?status=draft" });
  }
  // Organization — HR / Admin lane.
  if (role === "HR" || role === "ADMIN") {
    if (stats.pendingOnboarding) {
      items.push({ id: "onboarding", count: stats.pendingOnboarding, label: `${people(stats.pendingOnboarding)} to onboard`, cta: "Review onboarding", href: "/hr/directory/onboarding" });
    }
    if (stats.pendingOffboarding) {
      items.push({ id: "offboarding", count: stats.pendingOffboarding, label: `${people(stats.pendingOffboarding)} offboarding`, cta: "Review offboarding", href: "/hr/directory/offboarding" });
    }
    if (stats.pendingClearances) {
      items.push({ id: "clearances", count: stats.pendingClearances, label: `${plural(stats.pendingClearances, "clearance")} awaiting signature`, cta: "Review clearances", href: "/hr/directory/offboarding" });
    }
  }
  return items;
}

/** The single most-urgent action, for the hero CTA. Null when all caught up. */
export function dashboardPrimaryAction(items: DashAttentionItem[]): DashAttentionItem | null {
  return items[0] ?? null;
}

/** A standing context metric shown in "At a glance" (state, not a to-do). */
export interface GlanceCard {
  id: string;
  label: string;
  value: string | number;
  href: string;
  hint: string;
  /** 0–100 progress bar under the value, when meaningful. */
  progress?: number;
}

/**
 * Standing context metrics for every hat the user holds — NOT to-dos (those live in the band).
 * Empty when the user holds no context metrics (e.g. a caught-up active employee).
 */
export function buildGlanceCards(input: {
  role: string | undefined;
  isSupervisor: boolean | undefined;
  employeeStatus: EmployeeStatus | undefined;
  stats: DashboardStats | null;
}): GlanceCard[] {
  const { role, isSupervisor, employeeStatus, stats } = input;
  if (!stats) return [];
  const cards: GlanceCard[] = [];

  // Employee — onboarding progress is context (the "submit documents" action lives in the band).
  if (employeeStatus === "ONBOARDING" && stats.onboardingProgress != null) {
    cards.push({ id: "onboarding-progress", label: "Onboarding progress", value: `${stats.onboardingProgress}%`, progress: stats.onboardingProgress, href: "/employee/onboarding", hint: "How much of your onboarding checklist is complete." });
  }
  // Supervisor — standing team metrics.
  if (isSupervisor) {
    if (stats.directReports != null) {
      cards.push({ id: "direct-reports", label: "Direct reports", value: stats.directReports, href: "/supervisor/roster", hint: "People who report directly to you." });
    }
    if (stats.totalEvaluations != null && stats.totalEvaluations > 0) {
      const completed = stats.completedEvaluations ?? 0;
      // A full-width bar over a 1/1 denominator reads like a divider, so only show the bar once
      // the denominator is large enough for the proportion to carry meaning.
      const progress =
        stats.totalEvaluations > 1 ? Math.round((completed / stats.totalEvaluations) * 100) : undefined;
      cards.push({ id: "evals-complete", label: "Evals complete", value: `${completed}/${stats.totalEvaluations}`, progress, href: "/supervisor/evaluations", hint: "Evaluations you've completed out of those expected this cycle." });
    }
  }
  // HR / Admin — the workforce headline.
  if (role === "HR" || role === "ADMIN") {
    if (stats.activeEmployees != null) {
      cards.push({ id: "active-employees", label: "Active employees", value: stats.activeEmployees, href: "/hr/directory", hint: "Employees currently active across the organization." });
    }
  }
  return cards;
}
