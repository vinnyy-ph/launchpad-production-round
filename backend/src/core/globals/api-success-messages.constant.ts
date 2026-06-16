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
  EMPLOYEES_RETRIEVED: "Employees retrieved successfully",
  USER_CREATED: "User created successfully",
  USER_DEACTIVATED: "User deactivated successfully",
  USERS_RETRIEVED: "Users retrieved successfully",
  EVALUATION_CREATED: "Evaluation created successfully",
  EVALUATION_UPDATED: "Evaluation updated successfully",
  EVALUATION_DELETED: "Evaluation deleted successfully",
} as const;

export type ApiSuccessMessage =
  (typeof API_SUCCESS_MESSAGES)[keyof typeof API_SUCCESS_MESSAGES];
