import { apiFetch } from "@/shared/lib/api-client";
import type {
  EmployeeFilters,
  EmployeeListItem,
  EmployeeListMeta,
  EmployeeProfile,
  EmployeeUpdateInput,
} from "../types/employees.types";

export interface EmployeeListResult {
  data: EmployeeListItem[];
  meta: EmployeeListMeta;
}

export interface EmployeeProfileResult {
  data: EmployeeProfile;
}

const BASE = "/api/v1/employees";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export async function getEmployees(filters: EmployeeFilters = {}): Promise<EmployeeListResult> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.team) params.set("team", filters.team);
  if (filters.supervisorId) params.set("supervisorId", filters.supervisorId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDirection) params.set("sortDirection", filters.sortDirection);
  params.set("page", String(filters.page ?? DEFAULT_PAGE));
  params.set("limit", String(filters.limit ?? DEFAULT_LIMIT));

  const qs = params.toString();
  return apiFetch<EmployeeListResult>(`${BASE}?${qs}`);
}

export async function getEmployeeProfile(employeeId: string): Promise<EmployeeProfileResult> {
  return apiFetch<EmployeeProfileResult>(`${BASE}/${employeeId}`);
}

/** Updates an employee profile (HR/Admin only). Returns the refreshed full profile. */
export async function updateEmployee(
  employeeId: string,
  input: EmployeeUpdateInput,
): Promise<EmployeeProfileResult> {
  return apiFetch<EmployeeProfileResult>(`${BASE}/${employeeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
