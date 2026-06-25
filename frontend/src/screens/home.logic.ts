import type { DashboardStats } from "@/modules/dashboard/hooks/use-dashboard";
import type { AppUser, EmployeeStatus } from "@/modules/auth/types/auth.types";

/** First name for the greeting: first token of the display name, else the email local part. */
export function getFirstName(user: AppUser | null | undefined): string {
  const fromName = user?.displayName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = user?.email?.split("@")[0];
  return local ?? "";
}

/**
 * Greeting line, computed from the user's local time on load. Precedence:
 * the two edge bands (early start / working late) win over the Friday line; Friday only
 * replaces morning/afternoon/evening.
 *
 * Time-based by design. A first-ever-login "Welcome, [name]" line was scoped but dropped:
 * it needs a real first-login signal (e.g. last-login is null) that neither `AppUser` nor the
 * session response exposes — revisit if the backend adds one.
 */
export function computeGreeting(now: Date, firstName: string): string {
  const suffix = firstName ? `, ${firstName}` : "";
  const h = now.getHours();
  if (h >= 21 || h < 5) return `Working late${suffix}`;
  if (h < 7) return `Early start${suffix}`;
  if (now.getDay() === 5) return `Happy Friday${suffix}`;
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  return `Good evening${suffix}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
function people(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

/** One actionable row in a scope zone. */
export interface AttentionRow {
  id: string;
  count: number;
  label: string; // e.g. "3 pulse surveys to answer"
  action: string; // the link/button text, e.g. "Answer surveys"
  href: string;
}

/** Accessible name for a row's action — includes the destination and the count/label. */
export function rowAriaLabel(row: AttentionRow): string {
  return `${row.action} — ${row.label}`;
}

/**
 * The action queue grouped by scope. A zone is `null` when the user doesn't hold that role
 * (so the page renders nothing for it); an empty array means the role is held but nothing is
 * pending (so the page shows the zone's empty state).
 *
 * Only rows backed by a real `DashboardStats` field are included. Rows the spec asks for that
 * have no data yet are intentionally omitted and flagged for the backend, never mocked.
 */
export interface AttentionZones {
  forYou: AttentionRow[];
  organization: AttentionRow[] | null;
}

export function buildAttentionZones(input: {
  role: string | undefined;
  employeeStatus: EmployeeStatus | undefined;
  stats: DashboardStats | null;
  /** Clearances awaiting the signed-in user's signature (from useAssignedClearances). */
  pendingSignatures: number;
}): AttentionZones {
  const { role, employeeStatus, stats: s, pendingSignatures } = input;

  // For you — the employee lane everyone holds.
  const forYou: AttentionRow[] = [];
  if (pendingSignatures > 0) {
    forYou.push({ id: "sign", count: pendingSignatures, label: `${plural(pendingSignatures, "clearance")} to sign`, action: "Review clearances", href: "/employee/clearance" });
  }
  if (s?.pendingAcknowledgements) {
    forYou.push({ id: "acks", count: s.pendingAcknowledgements, label: `${plural(s.pendingAcknowledgements, "evaluation")} to acknowledge`, action: "Review evaluation", href: "/employee/surveys?tab=acknowledgements" });
  }
  if (s?.unreadSurveys) {
    forYou.push({ id: "pulses", count: s.unreadSurveys, label: `${plural(s.unreadSurveys, "pulse survey")} to answer`, action: "Answer surveys", href: "/employee/surveys" });
  }
  if (employeeStatus === "ONBOARDING" && s?.pendingDocuments) {
    forYou.push({ id: "docs", count: s.pendingDocuments, label: `${plural(s.pendingDocuments, "onboarding document")} to submit`, action: "Submit documents", href: "/employee/onboarding" });
  }

  // The organization — HR / Admin lane. Documents-to-review, clearance-rejected and
  // invitations-to-resend are flagged (no data); onboarding/offboarding/clearances are real.
  const organization =
    role === "HR" || role === "ADMIN"
      ? (() => {
          const rows: AttentionRow[] = [];
          if (s?.pendingOnboarding) {
            rows.push({ id: "onboard", count: s.pendingOnboarding, label: `${people(s.pendingOnboarding)} to onboard`, action: "Review onboarding", href: "/hr/directory?tab=onboarding" });
          }
          if (s?.pendingOffboarding) {
            rows.push({ id: "offboard", count: s.pendingOffboarding, label: `${people(s.pendingOffboarding)} offboarding`, action: "Review offboarding", href: "/hr/directory?tab=offboarding" });
          }
          if (s?.pendingClearances) {
            rows.push({ id: "clear", count: s.pendingClearances, label: `${plural(s.pendingClearances, "clearance")} in progress`, action: "View clearances", href: "/hr/directory?tab=offboarding" });
          }
          return rows;
        })()
      : null;

  return { forYou, organization };
}

/** Priority order for the band CTA: clearance > onboarding/offboarding > eval ack > pulse. */
const PRIORITY_RANK: Record<string, number> = {
  sign: 0, // clearance awaiting signature
  clear: 1, // org clearances in progress
  onboard: 2,
  offboard: 2,
  acks: 3,
  pulses: 4,
  docs: 4,
};

/** Band summary: how many things are pending across all zones, and the single top action. */
export function buildPriority(zones: AttentionZones): { count: number; primary: AttentionRow | null } {
  const all = [...zones.forYou, ...(zones.organization ?? [])];
  const primary = [...all].sort((a, b) => (PRIORITY_RANK[a.id] ?? 9) - (PRIORITY_RANK[b.id] ?? 9))[0] ?? null;
  return { count: all.length, primary };
}

