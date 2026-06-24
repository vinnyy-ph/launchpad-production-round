import { GRADE_LABELS, type Evaluation, type Reviewee } from "@/modules/performance/evaluations";

export type AckBucket = "ACKNOWLEDGED" | "AUTO_ACKNOWLEDGED" | "PENDING";

/** Plain-language acknowledgement state for a SENT evaluation. Mirrors evaluations.page `ackInfo`:
 *  an explicit ack wins only when it is NOT a deemed/auto ack. */
export function ackBucket(ev: Evaluation): AckBucket {
  const ack = ev.acknowledgement;
  if (ack?.acknowledgedAt && !ack.isDeemedAck) return "ACKNOWLEDGED";
  if (ack?.isDeemedAck) return "AUTO_ACKNOWLEDGED";
  return "PENDING";
}

export interface EvalSummary {
  sent: number;
  drafts: number;
  acknowledged: number;
  autoAcknowledged: number;
  pending: number;
  /** SENT-eval counts per grade, ordered 5 → 1. */
  gradeDistribution: { grade: number; label: string; count: number }[];
}

export interface AttentionItem {
  id: "drafts" | "pending" | "not-evaluated";
  count: number;
  label: string;
  href: string;
}

/** Evaluations authored by this supervisor. Empty when the caller id is unknown. */
function mine(evals: Evaluation[], myId: string | undefined): Evaluation[] {
  return myId ? evals.filter((e) => e.reviewerId === myId) : [];
}

export function summarizeEvaluations(evals: Evaluation[], myId: string | undefined): EvalSummary {
  const own = mine(evals, myId);
  const sent = own.filter((e) => e.isSent);
  const drafts = own.filter((e) => !e.isSent);

  let acknowledged = 0;
  let autoAcknowledged = 0;
  let pending = 0;
  for (const ev of sent) {
    const bucket = ackBucket(ev);
    if (bucket === "ACKNOWLEDGED") acknowledged++;
    else if (bucket === "AUTO_ACKNOWLEDGED") autoAcknowledged++;
    else pending++;
  }

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const ev of sent) {
    if (ev.grade >= 1 && ev.grade <= 5) counts[ev.grade] = (counts[ev.grade] ?? 0) + 1;
  }
  const gradeDistribution = [5, 4, 3, 2, 1].map((grade) => ({
    grade,
    label: GRADE_LABELS[grade] ?? `Grade ${grade}`,
    count: counts[grade] ?? 0,
  }));

  return { sent: sent.length, drafts: drafts.length, acknowledged, autoAcknowledged, pending, gradeDistribution };
}

/** Reviewees with ≥1 SENT evaluation, over total reviewees. */
export function computeCoverage(
  reviewees: Reviewee[],
  evals: Evaluation[],
  myId: string | undefined,
): { evaluated: number; total: number } {
  const sentIds = new Set(mine(evals, myId).filter((e) => e.isSent).map((e) => e.revieweeId));
  const evaluated = reviewees.filter((r) => sentIds.has(r.id)).length;
  return { evaluated, total: reviewees.length };
}

/** Reviewees with NO evaluation at all (no draft, no sent). A started draft is excluded. */
export function notEvaluatedCount(
  reviewees: Reviewee[],
  evals: Evaluation[],
  myId: string | undefined,
): number {
  const anyIds = new Set(mine(evals, myId).map((e) => e.revieweeId));
  return reviewees.filter((r) => !anyIds.has(r.id)).length;
}

/** Prioritized, non-zero action rows for the attention band. Empty = all caught up. */
export function buildAttentionItems(input: {
  drafts: number;
  pending: number;
  notEvaluated: number;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (input.drafts > 0) {
    items.push({
      id: "drafts",
      count: input.drafts,
      label: `${input.drafts} evaluation ${input.drafts === 1 ? "draft" : "drafts"} to finish`,
      href: "/supervisor/evaluations?status=draft",
    });
  }
  if (input.pending > 0) {
    items.push({
      id: "pending",
      count: input.pending,
      label: `${input.pending} sent ${input.pending === 1 ? "evaluation" : "evaluations"} awaiting acknowledgement`,
      href: "/supervisor/evaluations?status=sent",
    });
  }
  if (input.notEvaluated > 0) {
    items.push({
      id: "not-evaluated",
      count: input.notEvaluated,
      label: `${input.notEvaluated} team ${input.notEvaluated === 1 ? "member has" : "members have"} no evaluation yet`,
      href: "/supervisor/evaluations",
    });
  }
  return items;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Mean grade across this supervisor's SENT evaluations, to one decimal. Null when none sent. */
export function averageGrade(evals: Evaluation[], myId: string | undefined): number | null {
  const sent = mine(evals, myId).filter((e) => e.isSent);
  if (sent.length === 0) return null;
  const sum = sent.reduce((acc, e) => acc + e.grade, 0);
  return Math.round((sum / sent.length) * 10) / 10;
}

// A `type` (not `interface`) so it carries an implicit index signature and is assignable to the
// chart components' `Record<string, unknown>[]` data prop without a cast (matches how other chart
// call sites pass inline-shaped data).
export type TrendPoint = {
  period: string;
  avg: number;
  count: number;
};

/** Average SENT-eval grade per calendar month of `periodEnd`, oldest → newest. Label e.g. "Jun '26". */
export function gradeTrend(evals: Evaluation[], myId: string | undefined): TrendPoint[] {
  const sent = mine(evals, myId).filter((e) => e.isSent);
  const buckets = new Map<string, { sum: number; count: number; period: string }>();
  for (const e of sent) {
    const d = new Date(e.periodEnd);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const period = `${MONTHS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}`;
    const cur = buckets.get(key) ?? { sum: 0, count: 0, period };
    cur.sum += e.grade;
    cur.count += 1;
    buckets.set(key, cur);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ period: v.period, avg: Math.round((v.sum / v.count) * 10) / 10, count: v.count }));
}

/** Up/down magnitude between the last two trend points. Null with <2 points or no change. */
export function gradeDelta(trend: TrendPoint[]): { value: string; direction: "up" | "down" } | null {
  if (trend.length < 2) return null;
  const diff = Math.round((trend[trend.length - 1].avg - trend[trend.length - 2].avg) * 10) / 10;
  if (diff === 0) return null;
  return { value: Math.abs(diff).toFixed(1), direction: diff > 0 ? "up" : "down" };
}

/** Explicit-acknowledgement share of SENT evals as a 0–100 percent. Auto-ack excluded. Null when none sent. */
export function acknowledgedRate(summary: EvalSummary): number | null {
  if (summary.sent === 0) return null;
  return Math.round((summary.acknowledged / summary.sent) * 100);
}

export type ReportAckState = "ACKNOWLEDGED" | "AUTO_ACKNOWLEDGED" | "PENDING" | "NONE";

export interface ReportSnapshot {
  id: string;
  name: string;
  jobTitle: string | null;
  latestGrade: number | null;
  latestGradeLabel: string | null;
  lastReviewedAt: string | null;
  ackState: ReportAckState;
  hasDraft: boolean;
  action: { label: string; href: string };
  rank: number;
}

/** Sort key for "latest sent": sentAt when present, else periodEnd; NaN dates sink to 0. */
function sentTime(e: Evaluation): number {
  const t = new Date(e.sentAt ?? e.periodEnd).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** One performance snapshot per direct report, sorted needs-attention-first then by name. */
export function buildReportSnapshots(
  reviewees: Reviewee[],
  evals: Evaluation[],
  myId: string | undefined,
): ReportSnapshot[] {
  const own = mine(evals, myId);
  const snaps: ReportSnapshot[] = reviewees.map((r) => {
    const theirs = own.filter((e) => e.revieweeId === r.id);
    const sent = theirs.filter((e) => e.isSent).sort((a, b) => sentTime(b) - sentTime(a));
    const latest = sent[0] ?? null;
    const hasDraft = theirs.some((e) => !e.isSent);

    let latestGrade: number | null = null;
    let latestGradeLabel: string | null = null;
    let lastReviewedAt: string | null = null;
    let ackState: ReportAckState = "NONE";
    if (latest) {
      latestGrade = latest.grade;
      latestGradeLabel = GRADE_LABELS[latest.grade] ?? null;
      lastReviewedAt = latest.sentAt ?? latest.periodEnd;
      ackState = ackBucket(latest);
    }

    let action: { label: string; href: string };
    if (latest) action = { label: "View", href: "/supervisor/evaluations?status=sent" };
    else if (hasDraft) action = { label: "Finish draft", href: "/supervisor/evaluations?status=draft" };
    else action = { label: "Evaluate", href: "/supervisor/evaluations" };

    let rank: number;
    if (!latest && !hasDraft) rank = 0; // never evaluated
    else if (!latest && hasDraft) rank = 1; // draft in progress
    else if (ackState === "PENDING") rank = 2; // awaiting acknowledgement
    else if (latestGrade != null && latestGrade <= 2) rank = 3; // low grade, needs support
    else rank = 4; // healthy

    return { id: r.id, name: r.fullName, jobTitle: r.jobTitle, latestGrade, latestGradeLabel, lastReviewedAt, ackState, hasDraft, action, rank };
  });
  return snaps.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}
