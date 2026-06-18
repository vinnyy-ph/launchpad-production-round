/** Domain-level error message strings for the surveys module. */
export const SURVEY_ERROR_MESSAGES = {
  CREATOR_NOT_EMPLOYEE: "Creator is not linked to an employee record",
  SURVEY_NOT_FOUND: "Survey not found",
  QUESTIONS_REQUIRED: "questions must be a non-empty array",
  INVALID_RECURRING_TYPE: "Invalid recurringType value",
  INVALID_AUDIENCE_TYPE: "Invalid audienceType value",
  INVALID_VISIBILITY: "Invalid visibility value",
  INVALID_QUESTION_TYPE: "Invalid question type",
  SCALE_BOUNDS_REQUIRED: "LINEAR_SCALE questions require scaleMin and scaleMax",
  OPTIONS_REQUIRED: "MULTIPLE_CHOICE and CHECKBOX questions require options",
  INVALID_AUDIENCE_CONFIG: "Each audienceConfig must provide supervisorId or teamId (not both empty)",
  INVALID_STATUS: "status must be 'draft', 'active', or 'inactive'",
} as const;
