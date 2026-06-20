import { apiFetch } from "@/shared/lib/api-client";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentFilters,
  DepartmentListItem,
  DepartmentListMeta,
  UpdateDepartmentInput,
} from "../types/departments.types";

const BASE = "/api/v1/departments";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
/** Large page used by dropdowns that need every active department at once. */
const DROPDOWN_LIMIT = 100;

export interface DepartmentListResult {
  data: Department[];
}

export interface DepartmentPageResult {
  data: DepartmentListItem[];
  meta: DepartmentListMeta;
}

export interface DepartmentMutationResult {
  data: DepartmentListItem;
}

/** Loads all active departments (id + name) for HR employee edit dropdowns. */
export async function getDepartments(): Promise<DepartmentListResult> {
  return apiFetch<DepartmentListResult>(`${BASE}?limit=${DROPDOWN_LIMIT}`);
}

/** Loads one page of departments for the HR management table. */
export async function getDepartmentsPage(
  filters: DepartmentFilters = {},
): Promise<DepartmentPageResult> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDirection) params.set("sortDirection", filters.sortDirection);
  params.set("page", String(filters.page ?? DEFAULT_PAGE));
  params.set("limit", String(filters.limit ?? DEFAULT_LIMIT));

  return apiFetch<DepartmentPageResult>(`${BASE}?${params.toString()}`);
}

/** Creates a department (HR/Admin only). */
export async function createDepartment(
  input: CreateDepartmentInput,
): Promise<DepartmentMutationResult> {
  return apiFetch<DepartmentMutationResult>(BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Renames a department (HR/Admin only). */
export async function updateDepartment(
  departmentId: string,
  input: UpdateDepartmentInput,
): Promise<DepartmentMutationResult> {
  return apiFetch<DepartmentMutationResult>(`${BASE}/${departmentId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Soft-deletes a department (HR/Admin only). Rejected by the API when employees are assigned. */
export async function deleteDepartment(
  departmentId: string,
): Promise<DepartmentMutationResult> {
  return apiFetch<DepartmentMutationResult>(`${BASE}/${departmentId}`, {
    method: "DELETE",
  });
}
