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
  EMPLOYEE_ALREADY_EXISTS: "An employee with this email already exists",
  SUPERVISOR_NOT_FOUND: "Supervisor not found",
  ONBOARDING_FAILED: "Failed to create onboarding record",
  INVALID_EMERGENCY_CONTACT_PHONE:
    "Emergency contact must include a valid Philippine mobile number",
  EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE:
    "This emergency contact phone number is already assigned to another employee",
  DOCUMENT_NOT_FOUND: "Required document not found",
} as const;

export type ApiErrorMessage = (typeof API_ERROR_MESSAGES)[keyof typeof API_ERROR_MESSAGES];
