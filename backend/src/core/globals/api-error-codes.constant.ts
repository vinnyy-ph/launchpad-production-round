/**
 * Stable machine-readable error codes returned by API error responses.
 * Clients can use these codes for branching without parsing human-readable messages.
 */
export const API_ERROR_CODES = {
  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  INVALID_EMPLOYEE_PROFILE_UPDATE: "INVALID_EMPLOYEE_PROFILE_UPDATE",
  INVALID_EMPLOYEE_STATUS: "INVALID_EMPLOYEE_STATUS",
  INVALID_ENUM_VALUE: "INVALID_ENUM_VALUE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
