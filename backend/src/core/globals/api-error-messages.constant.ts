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
  CANNOT_DEACTIVATE_LAST_ADMIN: "Cannot deactivate the last admin account",
  USER_ALREADY_DEACTIVATED: "User is already deactivated",
  INVALID_USER_ROLE: "Role must be HR or Employee",
} as const;

export type ApiErrorMessage = (typeof API_ERROR_MESSAGES)[keyof typeof API_ERROR_MESSAGES];
