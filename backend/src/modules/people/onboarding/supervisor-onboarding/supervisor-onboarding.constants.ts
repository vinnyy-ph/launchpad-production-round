/** Default number of onboarding statuses returned per request. */
export const DEFAULT_SUPERVISOR_ONBOARDING_LIMIT = 20;

/** Maximum number of onboarding statuses returned per request. */
export const MAX_SUPERVISOR_ONBOARDING_LIMIT = 50;

/** Query parameter field names for supervisor onboarding endpoints. */
export const SUPERVISOR_ONBOARDING_FIELDS = {
  STATUS: "status",
  LIMIT: "limit",
  PAGE: "page",
} as const;

/** Allowed status filter values for listing subordinate onboarding progress. */
export const SUPERVISOR_ONBOARDING_STATUS_FILTERS = ["onboarding", "completed"] as const;
