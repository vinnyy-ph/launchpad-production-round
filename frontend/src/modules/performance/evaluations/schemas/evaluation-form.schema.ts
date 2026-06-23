import { z } from "zod";
import { safeText } from "@/shared/lib/safe-text";

/** Max character lengths for evaluation free-text fields — mirrors the backend. */
export const EVAL_TEXT_LIMITS = {
  EVALUATION: 5000,
  RECOMMENDATION: 5000,
  ITEM: 1000,
} as const;

/**
 * Validates the free-text fields of the evaluation editor. Required/structural
 * checks (reviewee, period, grade) stay in the form's own validate(); this
 * schema only covers length + content safety of the text fields.
 */
export const evaluationTextSchema = z.object({
  evaluation: safeText("Overall summary", EVAL_TEXT_LIMITS.EVALUATION),
  recommendation: safeText("Recommendation", EVAL_TEXT_LIMITS.RECOMMENDATION),
  highlights: z.array(safeText("Highlight", EVAL_TEXT_LIMITS.ITEM)),
  lowlights: z.array(safeText("Area for improvement", EVAL_TEXT_LIMITS.ITEM)),
});

export type EvaluationTextInput = z.infer<typeof evaluationTextSchema>;
