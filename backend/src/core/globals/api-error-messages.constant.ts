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
  EMPLOYEE_NOT_FOUND: "Employee not found",
  INVALID_EMPLOYEE_PROFILE_UPDATE: "Invalid employee profile update",
  INVALID_EMPLOYEE_STATUS: "Invalid employee status",
  SUPERVISOR_NOT_FOUND: "Supervisor not found",
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "A user with this email already exists",
  CANNOT_DEACTIVATE_SELF: "You cannot deactivate your own account",
  CANNOT_DEACTIVATE_LAST_ADMIN: "Cannot deactivate the last remaining admin. The system must always have at least one admin.",
  CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role",
  CANNOT_DEMOTE_LAST_ADMIN: "Cannot change the role of the last remaining admin. The system must always have at least one admin.",
  USER_ALREADY_DEACTIVATED: "User is already deactivated",
  INVALID_USER_ROLE: "Role must be HR or Employee",
  NOT_SUPERVISOR: "You are not the direct supervisor of this employee",
  REVIEWER_NOT_EMPLOYEE: "Your account is not linked to an employee record",
  EVALUATION_NOT_FOUND: "Evaluation not found",
  EVALUATION_ALREADY_SENT: "This evaluation has already been sent and cannot be edited",
  NOT_EVALUATION_REVIEWER: "You are not the reviewer for this evaluation",
  NOT_EVALUATION_REVIEWEE: "You are not the reviewee for this evaluation",
  EVALUATION_NOT_SENT: "This evaluation has not been sent yet",
  EVALUATION_ALREADY_ACKNOWLEDGED: "This evaluation has already been acknowledged",
  REVIEWEE_NOT_EMPLOYEE: "Your account is not linked to an employee record",
} as const;

export type ApiErrorMessage = (typeof API_ERROR_MESSAGES)[keyof typeof API_ERROR_MESSAGES];
