import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser, EmployeeStatus } from "@/modules/auth/types/auth.types";
import type { Notification } from "@/modules/notifications/types/notifications.types";

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

/** Join clauses naturally: "a", "a and b", "a, b and c". */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** People count, e.g. "1 person" / "3 people". */
function people(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

/**
 * A plain-language line of what's waiting, aggregated across every hat the user holds
 * (personal → team → org). Capped at three clauses so it never becomes a run-on.
 */
export function buildSummary(
  role: string | undefined,
  isSupervisor: boolean | undefined,
  stats: DashboardStats | null,
): string {
  if (!stats) return "Here's your day at a glance.";

  const clauses: string[] = [];
  if (stats.unreadSurveys) clauses.push(`${plural(stats.unreadSurveys, "survey")} to answer`);
  if (stats.pendingAcknowledgements) clauses.push(`${plural(stats.pendingAcknowledgements, "evaluation")} to acknowledge`);
  if (isSupervisor && stats.pendingEvaluations) clauses.push(`${plural(stats.pendingEvaluations, "evaluation")} to finish`);
  if (role === "HR" || role === "ADMIN") {
    if (stats.pendingOnboarding) clauses.push(`${people(stats.pendingOnboarding)} onboarding`);
    if (stats.pendingOffboarding) clauses.push(`${people(stats.pendingOffboarding)} offboarding`);
    if (stats.pendingClearances) clauses.push(`${plural(stats.pendingClearances, "clearance")} to sign`);
  }

  if (clauses.length === 0) return "You're all caught up — nice work.";
  if (clauses.length <= 3) return `You have ${joinClauses(clauses)}.`;
  return `You have ${joinClauses(clauses.slice(0, 2))}, and ${clauses.length - 2} more things to review.`;
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
      cards.push({ id: "evals-complete", label: "Evals complete", value: `${completed}/${stats.totalEvaluations}`, progress: Math.round((completed / stats.totalEvaluations) * 100), href: "/supervisor/evaluations", hint: "Evaluations you've completed out of those expected this cycle." });
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

/** One feed row after collapsing exact duplicates: the most recent of the group, plus how many. */
export interface GroupedNotification {
  notification: Notification;
  /** Number of rows collapsed into this one (1 = no duplicates). */
  count: number;
}

/**
 * Collapse exact-duplicate notifications (same subject + body) into a single row, keeping the
 * most recent of each group and a count of how many arrived. First-appearance order is preserved,
 * so a feed already sorted newest-first stays newest-first.
 */
export function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups = new Map<string, Notification[]>();
  const order: string[] = [];
  for (const n of notifications) {
    const key = `${n.subject} ${n.body}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(n);
    } else {
      groups.set(key, [n]);
      order.push(key);
    }
  }
  return order.map((key) => {
    const items = groups.get(key)!;
    // createdAt is ISO 8601, so lexical comparison is chronological.
    const newest = items.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
    return { notification: newest, count: items.length };
  });
}
