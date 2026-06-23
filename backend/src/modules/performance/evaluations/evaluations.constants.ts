export const EVAL_ERROR_MESSAGES = {
  REVIEWER_NOT_EMPLOYEE: "Reviewer has no employee record",
  REVIEWEE_NOT_EMPLOYEE: "Reviewee has no employee record",
  REVIEWEE_NOT_FOUND: "Employee not found",
  NOT_DIRECT_SUPERVISOR: "Not a direct supervisor",
  EVALUATION_NOT_FOUND: "Evaluation not found",
  ALREADY_SENT: "Evaluation already sent",
  NOT_REVIEWER: "Not the evaluation reviewer",
  NOT_AUTHORIZED: "Not authorized to view this evaluation",
  NOT_REVIEWEE: "Not the evaluation reviewee",
  EVALUATION_NOT_SENT: "Evaluation has not been sent",
  ALREADY_ACKNOWLEDGED: "Evaluation already acknowledged",
} as const;

export const EVAL_ACK_DEADLINE_DAYS = 7;

/** Max character lengths for user-supplied free-text evaluation fields. */
export const EVAL_TEXT_LIMITS = {
  EVALUATION: 5000,
  RECOMMENDATION: 5000,
  ITEM: 1000,
} as const;

export const EVAL_UPLOAD_ERROR_MESSAGES = {
  TOO_MANY_FILES: "Too many files — maximum 5 allowed",
  INVALID_FILE_TYPE: "Only PDF files are allowed",
  FILE_TOO_LARGE: "File size exceeds the 10 MB limit",
} as const;
