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
  EVALUATION_CREATED: "Evaluation created successfully",
  EVALUATION_UPDATED: "Evaluation updated successfully",
  EVALUATION_DELETED: "Evaluation deleted successfully",
  EVALUATION_SENT: "Evaluation sent successfully",
  EVALUATION_ACKNOWLEDGED: "Evaluation acknowledged successfully",
  EVALUATIONS_RETRIEVED: "Evaluations retrieved successfully",
  SURVEY_CREATED: "Pulse survey created successfully",
} as const;

export type ApiSuccessMessage =
  (typeof API_SUCCESS_MESSAGES)[keyof typeof API_SUCCESS_MESSAGES];
