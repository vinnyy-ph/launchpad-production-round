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
  ONBOARDING_FAILED: "Failed to create onboarding record",
  INVALID_EMERGENCY_CONTACT_PHONE:
    "Emergency contact must include a valid Philippine mobile number",
  EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE:
    "This emergency contact phone number is already assigned to another employee",
  DOCUMENT_NOT_FOUND: "Required document not found",
  CUSTOM_FIELD_NOT_FOUND: "Custom field not found",
  INVITATION_NOT_FOUND: "Invitation not found",
  INVITATION_ALREADY_ACCEPTED: "Invitation has already been accepted",
  ACCOUNT_ALREADY_CREATED:
    "The employee has already created their account. The email cannot be changed.",
  ONBOARDING_RECORD_NOT_FOUND: "Onboarding record not found",
  INVALID_EMAIL: "A valid email address is required",
  INVITATION_DELIVERY_FAILED: "Failed to deliver the invitation email",
  ONBOARDING_ALREADY_COMPLETE: "Onboarding has already been completed",
  INVITATION_EXPIRED: "The onboarding invitation has expired",
  ONBOARDING_INCOMPLETE:
    "Onboarding cannot be completed until all required profile fields, custom fields, and documents are submitted",
  INVALID_FILE_TYPE: "The uploaded file type is not allowed for this document",
  DOCUMENT_SUBMISSION_NOT_ALLOWED:
    "A document can only be re-submitted when the previous submission was rejected",
  SUBMISSION_NOT_FOUND: "Document submission not found",
  SUBMISSION_ALREADY_REVIEWED:
    "This document submission has already been reviewed",
  REVIEWER_EMPLOYEE_NOT_FOUND:
    "No employee profile was found for the reviewing HR account",
  EMPLOYEE_ONBOARDING_NOT_FOUND:
    "No onboarding record was found for this employee account",
  ONBOARDING_NOT_READY:
    "Onboarding cannot be completed until all required profile fields are filled and all required documents are approved",
  NOTIFICATION_NOT_FOUND: "Notification not found",
  EMPLOYEE_PROFILE_NOT_FOUND:
    "No employee profile was found for this account",
} as const;

export type ApiErrorMessage = (typeof API_ERROR_MESSAGES)[keyof typeof API_ERROR_MESSAGES];
