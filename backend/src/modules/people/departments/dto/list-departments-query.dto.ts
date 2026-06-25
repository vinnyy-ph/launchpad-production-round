/** Columns the department list can be ordered by. */
export type DepartmentSortBy = "name" | "employeeCount" | "createdAt";

export type SortDirection = "asc" | "desc";

/**
 * Normalized query parameters supported by GET /api/v1/departments.
 * Validation converts raw Express query values into this DTO before service logic runs.
 */
export interface ListDepartmentsQueryDto {
  /** Case-insensitive match against the department name. */
  search?: string;
  sortBy?: DepartmentSortBy;
  sortDirection?: SortDirection;
  page: number;
  limit: number;
}
