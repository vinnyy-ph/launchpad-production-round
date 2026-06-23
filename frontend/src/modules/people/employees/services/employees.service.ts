import { apiFetch } from "@/shared/lib/api-client";
import type {
  EmployeeFilters,
  EmployeeListItem,
  EmployeeListMeta,
  EmployeeProfile,
  EmployeeUpdateInput,
  MyProfileUpdateInput,
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
  // Statuses are sent as a single comma-separated value the API parses into a list.
  if (filters.statuses?.length) params.set("statuses", filters.statuses.join(","));
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.team) params.set("team", filters.team);
  // Team ids are sent as a single comma-separated value the API parses into a list.
  if (filters.teamIds?.length) params.set("teamIds", filters.teamIds.join(","));
  // Department ids are sent as a single comma-separated value the API parses into a list.
  if (filters.departmentIds?.length) params.set("departmentId", filters.departmentIds.join(","));
  // Supervisor ids are sent as a single comma-separated value the API parses into a list.
  if (filters.supervisorIds?.length) params.set("supervisorId", filters.supervisorIds.join(","));
  if (filters.reportingToId) params.set("reportingToId", filters.reportingToId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDirection) params.set("sortDirection", filters.sortDirection);
  params.set("page", String(filters.page ?? DEFAULT_PAGE));
  params.set("limit", String(filters.limit ?? DEFAULT_LIMIT));

  const qs = params.toString();
  return apiFetch<EmployeeListResult>(`${BASE}?${qs}`);
}

/**
 * Fetches the entire directory in one non-paginated payload (org chart). HR/Admin get full
 * fields; other viewers get redacted items. Returns just the list — there is no pagination meta.
 */
export async function getAllEmployees(): Promise<EmployeeListItem[]> {
  const res = await apiFetch<{ data: EmployeeListItem[] }>(`${BASE}/all`);
  return res.data;
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

/** Updates the signed-in employee's OWN profile (self-service). Returns the refreshed profile. */
export async function updateMyProfile(
  input: MyProfileUpdateInput,
): Promise<EmployeeProfileResult> {
  return apiFetch<EmployeeProfileResult>(`${BASE}/me`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface ActivityLogEntry {
  id: string;
  editorId: string;
  editorName: string;
  editorEmail: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
}

export interface EmployeeActivityLogsResult {
  data: ActivityLogEntry[];
}

/** Returns profile field edit history for one employee (HR/Admin only). */
export async function getEmployeeActivityLogs(employeeId: string): Promise<EmployeeActivityLogsResult> {
  return apiFetch<EmployeeActivityLogsResult>(`${BASE}/${employeeId}/activity-logs`);
}

export type EmployeeDocumentStatus = "pending" | "approved" | "rejected";

export interface EmployeeDocument {
  id: string;
  documentName: string;
  fileUrl: string;
  status: EmployeeDocumentStatus;
  rejectionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface EmployeeDocumentsResult {
  data: EmployeeDocument[];
}

/** Returns documents uploaded by one employee (HR/Admin only). */
export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocumentsResult> {
  return apiFetch<EmployeeDocumentsResult>(`${BASE}/${employeeId}/documents`);
}
