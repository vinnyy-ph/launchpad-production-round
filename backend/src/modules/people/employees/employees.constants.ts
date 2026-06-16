/**
 * Query field names supported by the employee list endpoint.
 */
export const EMPLOYEE_QUERY_FIELDS = {
  EMPLOYEE_ID: "employeeId",
  STATUS: "status",
} as const;

/**
 * Public employee status filter values accepted by the API.
 */
export const EMPLOYEE_STATUS_FILTER_VALUES = [
  "onboarding",
  "active",
  "offboarding",
  "inactive",
] as const;

/**
 * Human-readable validation message for invalid employee status filters.
 */
export const EMPLOYEE_STATUS_FILTER_MESSAGE = `Allowed values: ${EMPLOYEE_STATUS_FILTER_VALUES.join(", ")}`;
