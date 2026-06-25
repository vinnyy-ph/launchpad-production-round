import {
  mapPeopleFieldTextError,
  validatePeopleFieldText,
} from "@/modules/people/people-text";
import { SURVEY_TEXT_LIMITS } from "../schemas/survey-form.schema";
import type { QuestionType } from "../types/surveys.types";

const SURVEY_ANSWER_MESSAGES = {
  invalid:
    "Please enter a valid answer using letters, numbers, spaces, and common punctuation only.",
} as const;

export function surveyAnswerMaxLength(type: "SHORT_ANSWER" | "LONG_ANSWER"): number {
  return type === "SHORT_ANSWER"
    ? SURVEY_TEXT_LIMITS.ANSWER_SHORT
    : SURVEY_TEXT_LIMITS.ANSWER_LONG;
}

/** Live onChange validation — profanity/XSS/length only (not required-empty). */
export function surveyAnswerChangeError(
  value: string,
  type: "SHORT_ANSWER" | "LONG_ANSWER",
): string | undefined {
  if (!value.trim()) return undefined;
  return validateSurveyAnswerText(value, type);
}

/** Profanity, XSS, and length checks for short/long survey answers. */
export function validateSurveyAnswerText(
  value: string,
  type: "SHORT_ANSWER" | "LONG_ANSWER",
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return mapPeopleFieldTextError(
    validatePeopleFieldText(trimmed, "Answer", surveyAnswerMaxLength(type)),
    SURVEY_ANSWER_MESSAGES.invalid,
  );
}

export function isTextAnswerType(
  type: QuestionType,
): type is "SHORT_ANSWER" | "LONG_ANSWER" {
  return type === "SHORT_ANSWER" || type === "LONG_ANSWER";
}
