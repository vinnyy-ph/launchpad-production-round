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
