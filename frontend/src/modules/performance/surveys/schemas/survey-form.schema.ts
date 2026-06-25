/** Max character lengths for survey free-text fields — mirrors the backend. */
export const SURVEY_TEXT_LIMITS = {
  NAME: 200,
  QUESTION_TEXT: 500,
  SCALE_LABEL: 100,
  OPTION: 200,
  ANSWER_SHORT: 500,
  ANSWER_LONG: 2000,
  SHARE_MESSAGE: 2000,
} as const;
