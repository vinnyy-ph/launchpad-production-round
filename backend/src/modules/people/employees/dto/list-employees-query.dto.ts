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
  /** One or more statuses; results match any of them. Parsed from a comma-separated param. */
  statuses?: EmployeeStatus[];
  teamId?: string;
  team?: string;
  /** One or more team ids; results match any of them. Parsed from a comma-separated param. */
  teamIds?: string[];
  /** One or more department ids; results match any of them. Parsed from a comma-separated param. */
  departmentIds?: string[];
  /** One or more supervisor ids; results match any of them. Parsed from a comma-separated param. */
  supervisorIds?: string[];
  /**
   * Scopes results to this supervisor's entire downward hierarchy — their direct reports and
   * everyone below them, transitively. Unlike `supervisorIds` (a direct-report match), this
   * walks the supervisor tree.
   */
  reportingToId?: string;
  sortBy?: EmployeeSortBy;
  sortDirection?: SortDirection;
  page: number;
  limit: number;
}
