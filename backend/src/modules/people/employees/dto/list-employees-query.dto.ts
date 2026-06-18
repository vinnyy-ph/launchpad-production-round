import type { EmployeeStatus } from "@prisma/client";

export type EmployeeSortBy =
  | "employeeName"
  | "jobTitle"
  | "department"
  | "supervisor"
  | "teams"
  | "status";

export type SortDirection = "asc" | "desc";

/**
 * Normalized query parameters supported by GET /api/employees.
 * Validation converts raw Express query values into this DTO before service logic runs.
 */
export interface ListEmployeesQueryDto {
  search?: string;
  status?: EmployeeStatus;
  teamId?: string;
  team?: string;
  supervisorId?: string;
  sortBy?: EmployeeSortBy;
  sortDirection?: SortDirection;
  page: number;
  limit: number;
}
