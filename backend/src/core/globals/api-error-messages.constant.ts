/**
 * Shared error messages for API responses.
 * Prefer these constants over repeated string literals in controllers and services.
 */
export const API_ERROR_MESSAGES = {
  BAD_REQUEST: "Bad request",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Resource not found",
  VALIDATION_FAILED: "Validation failed",
  INTERNAL_SERVER_ERROR: "Internal server error",
  INVALID_EMPLOYEE_STATUS: "Invalid employee status",
} as const;

export type ApiErrorMessage = (typeof API_ERROR_MESSAGES)[keyof typeof API_ERROR_MESSAGES];
