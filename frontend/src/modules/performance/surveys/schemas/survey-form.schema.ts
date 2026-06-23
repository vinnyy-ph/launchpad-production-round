import { safeText } from "@/shared/lib/safe-text";

/** Max character lengths for survey free-text fields — mirrors the backend. */
export const SURVEY_TEXT_LIMITS = {
  NAME: 200,
  QUESTION_TEXT: 500,
  SCALE_LABEL: 100,
  OPTION: 200,
} as const;

export const surveyNameSchema = safeText("Name", SURVEY_TEXT_LIMITS.NAME);
export const questionTextSchema = safeText("Question", SURVEY_TEXT_LIMITS.QUESTION_TEXT);
export const optionSchema = safeText("Option", SURVEY_TEXT_LIMITS.OPTION);
export const scaleLabelSchema = safeText("Scale label", SURVEY_TEXT_LIMITS.SCALE_LABEL);
