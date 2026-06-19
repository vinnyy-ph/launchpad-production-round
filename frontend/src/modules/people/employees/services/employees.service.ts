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
  // Supervisor ids are sent as a single comma-separated value the API parses into a list.
  if (filters.supervisorIds?.length) params.set("supervisorId", filters.supervisorIds.join(","));
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
