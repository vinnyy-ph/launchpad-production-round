/**
 * Shared success messages for API responses.
 * Add module-specific messages here only when they are reused across controllers.
 */
export const API_SUCCESS_MESSAGES = {
  REQUEST_SUCCESSFUL: "Request successful",
  RESOURCE_CREATED: "Resource created successfully",
  RESOURCE_UPDATED: "Resource updated successfully",
  RESOURCE_DELETED: "Resource deleted successfully",
  EMPLOYEE_RETRIEVED: "Employee retrieved successfully",
  EMPLOYEE_PROFILE_UPDATED: "Employee profile updated successfully",
  EMPLOYEES_RETRIEVED: "Employees retrieved successfully",
  USER_CREATED: "User created successfully",
  USER_DEACTIVATED: "User deactivated successfully",
  USER_ROLE_UPDATED: "User role updated successfully",
  USERS_RETRIEVED: "Users retrieved successfully",
  EMPLOYEE_ONBOARDED: "Employee onboarded successfully",
  DOCUMENT_CREATED: "Required document created successfully",
  DOCUMENTS_RETRIEVED: "Required documents retrieved successfully",
  DOCUMENT_RETRIEVED: "Required document retrieved successfully",
  DOCUMENT_UPDATED: "Required document updated successfully",
  DOCUMENT_DELETED: "Required document deleted successfully",
  CUSTOM_FIELD_CREATED: "Custom field created successfully",
  CUSTOM_FIELDS_RETRIEVED: "Custom fields retrieved successfully",
  CUSTOM_FIELD_RETRIEVED: "Custom field retrieved successfully",
  CUSTOM_FIELD_UPDATED: "Custom field updated successfully",
  CUSTOM_FIELD_DELETED: "Custom field deleted successfully",
  INVITATION_SENT: "Invitation sent successfully",
  INVITATION_RESENT: "Invitation resent successfully",
  INVITATION_EMAIL_UPDATED: "Invitation email updated and resent successfully",
  INVITATION_STATUS_RETRIEVED: "Invitation status retrieved successfully",
  INVITATION_ACCEPTED: "Invitation accepted successfully",
  ONBOARDING_STATUS_RETRIEVED: "Onboarding status retrieved successfully",
  ONBOARDING_PROFILE_UPDATED: "Onboarding profile updated successfully",
  CUSTOM_FIELD_VALUES_SAVED: "Custom field values saved successfully",
  DOCUMENT_SUBMITTED: "Document submitted successfully",
  ONBOARDING_COMPLETED: "Onboarding completed successfully",
} as const;

export type ApiSuccessMessage =
  (typeof API_SUCCESS_MESSAGES)[keyof typeof API_SUCCESS_MESSAGES];
