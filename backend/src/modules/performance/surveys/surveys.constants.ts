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
  AUDIENCE_CONFIG_REQUIRED_SUPERVISOR:
    "audienceConfigs must include at least one supervisorId when audienceType is SUPERVISOR_BASED",
  AUDIENCE_CONFIG_REQUIRED_TEAM:
    "audienceConfigs must include at least one teamId when audienceType is SPECIFIC_TEAMS",
  INVALID_STATUS: "status must be 'draft', 'active', or 'inactive'",
  SURVEY_ALREADY_ACTIVATED: "Cannot update questions, audienceType, audienceConfigs, isAnonymous, or recurringType after it has been activated",
  SURVEY_ALREADY_ACTIVE: "Survey is already active",
  SURVEY_ALREADY_INACTIVE: "Survey is already inactive",
  OCCURRENCE_NOT_FOUND: "Occurrence not found",
  RESULTS_FORBIDDEN: "You do not have permission to view results",
  RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR:
    "This team has fewer than 3 members, so its anonymous results are not visible to the team supervisor",
  BOTH_FILTERS_PROVIDED: "Only one of teamId or supervisorId may be provided",
  RESULTS_SUPPRESSED: "Insufficient responses to display results",
} as const;
