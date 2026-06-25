import {
  STATUS_LABEL,
  type QuestionResult,
  type SurveyResults,
  type VisibleResultSurvey,
} from "@/modules/performance/surveys/types/surveys.types";

export interface PulseCardModel {
  id: string;
  name: string;
  isAnonymous: boolean;
  statusLabel: string;
  /** responded / recipient participation when results are readable. */
  participation: { responded: number; recipient: number; pct: number } | null;
  /** Mean across LINEAR_SCALE question averages (1 dp) + derived scale max. Null when suppressed / none. */
  sentiment: { avg: number; scaleMax: number } | null;
  /** Server suppressed the breakdown (minimum group size). */
  suppressed: boolean;
  /** Small anonymous team → this supervisor is forbidden the results (403). */
  forbidden: boolean;
}

/** Participation rate from the (unfiltered) recipient/responded counts. Null with no recipients. */
export function pulseParticipation(
  results: SurveyResults,
): { responded: number; recipient: number; pct: number } | null {
  if (results.recipientCount <= 0) return null;
  return {
    responded: results.respondedCount,
    recipient: results.recipientCount,
    pct: Math.round((results.respondedCount / results.recipientCount) * 100),
  };
}

type LinearResult = Extract<QuestionResult, { type: "LINEAR_SCALE" }>;

/** Mean of the LINEAR_SCALE question averages, with a best-effort scale max. Null when suppressed
 *  or there are no scale questions. The scale max is the largest answer value seen across the
 *  scale questions (the results payload carries no scale definition); defaults to 5. */
export function pulseSentiment(results: SurveyResults): { avg: number; scaleMax: number } | null {
  if (results.suppressed) return null;
  // Only scale questions that actually received responses — a survey with linear questions but
  // zero answers yet would otherwise report a misleading 0.0 average next to "No responses yet".
  const answered = results.questions.filter(
    (q): q is LinearResult => q.type === "LINEAR_SCALE" && q.responseCount > 0,
  );
  if (answered.length === 0) return null;
  const avg = answered.reduce((s, q) => s + q.average, 0) / answered.length;
  const scaleMax = Math.max(
    ...answered.map((q) => {
      const keys = Object.keys(q.distribution).map(Number).filter((n) => !Number.isNaN(n));
      return Math.max(q.max, ...(keys.length ? keys : [0]));
    }),
  );
  return { avg: Math.round(avg * 10) / 10, scaleMax: scaleMax || 5 };
}

/** Combine a discovery-list survey with its fetched results (or a forbidden flag) into a card model. */
export function buildPulseCard(
  survey: VisibleResultSurvey,
  results: SurveyResults | null,
  forbidden: boolean,
): PulseCardModel {
  return {
    id: survey.id,
    name: survey.name,
    isAnonymous: survey.isAnonymous,
    statusLabel: STATUS_LABEL[survey.status],
    participation: results ? pulseParticipation(results) : null,
    sentiment: results ? pulseSentiment(results) : null,
    suppressed: results?.suppressed ?? false,
    forbidden,
  };
}
