import {
  mapPeopleFieldTextError,
  validatePeopleFieldText,
} from "@/modules/people/people-text";
import { EVAL_TEXT_LIMITS } from "../schemas/evaluation-form.schema";

const EVALUATION_TEXT_MESSAGES = {
  summary: "Please enter a valid overall summary.",
  recommendation: "Please enter a valid recommendation.",
  highlight: "Please enter a valid highlight.",
  lowlight: "Please enter a valid area for improvement.",
} as const;

function mapEvaluationFieldError(
  value: string,
  label: string,
  maxLen: number,
  fallback: string,
): string | undefined {
  if (!value.trim()) return undefined;
  return mapPeopleFieldTextError(
    validatePeopleFieldText(value, label, maxLen),
    fallback,
  );
}

/** Profanity, XSS, and length checks for evaluation free-text fields. */
export function validateEvaluationTextFields(input: {
  evaluation: string;
  recommendation: string;
  highlights: string[];
  lowlights: string[];
}): Record<string, string> {
  const errs: Record<string, string> = {};

  const summaryError = mapEvaluationFieldError(
    input.evaluation,
    "Overall summary",
    EVAL_TEXT_LIMITS.EVALUATION,
    EVALUATION_TEXT_MESSAGES.summary,
  );
  if (summaryError) errs.summary = summaryError;

  const recommendationError = mapEvaluationFieldError(
    input.recommendation,
    "Recommendation",
    EVAL_TEXT_LIMITS.RECOMMENDATION,
    EVALUATION_TEXT_MESSAGES.recommendation,
  );
  if (recommendationError) errs.recommendation = recommendationError;

  for (const item of input.highlights) {
    if (!item.trim()) continue;
    const highlightError = mapEvaluationFieldError(
      item,
      "Highlight",
      EVAL_TEXT_LIMITS.ITEM,
      EVALUATION_TEXT_MESSAGES.highlight,
    );
    if (highlightError) {
      errs.highlights = highlightError;
      break;
    }
  }

  for (const item of input.lowlights) {
    if (!item.trim()) continue;
    const lowlightError = mapEvaluationFieldError(
      item,
      "Area for improvement",
      EVAL_TEXT_LIMITS.ITEM,
      EVALUATION_TEXT_MESSAGES.lowlight,
    );
    if (lowlightError) {
      errs.lowlights = lowlightError;
      break;
    }
  }

  return errs;
}
