import type { DepartmentSortBy } from "./dto";

/** Request field names referenced by department validation errors. */
export const DEPARTMENT_FIELDS = {
  BODY: "body",
  NAME: "name",
  DEPARTMENT_ID: "departmentId",
} as const;

/** Sort keys accepted by the department list endpoint. */
export const DEPARTMENT_SORT_FIELDS: DepartmentSortBy[] = [
  "name",
  "employeeCount",
  "createdAt",
];

/** Pagination defaults and bounds for the department list endpoint. */
export const DEPARTMENT_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/** Maximum length accepted for a department name. */
export const DEPARTMENT_NAME_MAX_LENGTH = 100;
