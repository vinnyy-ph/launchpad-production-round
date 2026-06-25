/** Minimal department shape used by HR employee edit dropdowns. */
export interface Department {
  id: string;
  name: string;
}

/** A department row in the HR management table, with its assigned employee count. */
export interface DepartmentListItem {
  id: string;
  name: string;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export type DepartmentSortBy = "name" | "employeeCount" | "createdAt";
export type SortDirection = "asc" | "desc";

/** Query parameters for the paginated department list. */
export interface DepartmentFilters {
  search?: string;
  sortBy?: DepartmentSortBy;
  sortDirection?: SortDirection;
  page?: number;
  limit?: number;
}

/** Pagination metadata returned alongside the department list. */
export interface DepartmentListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateDepartmentInput {
  name: string;
}

export interface UpdateDepartmentInput {
  name: string;
}
