import { apiFetch } from "@/shared/lib/api-client";
import type { EmployeeFilters, EmployeeListItem } from "../types/employees.types";

// Spec contract: GET /api/employees?search=&status=&teamId=&supervisorId=
// (Running backend currently exposes /api/v1/employees — reconcile the path with the lead.)
const BASE = "/api/employees";

export function getEmployees(filters: EmployeeFilters = {}): Promise<EmployeeListItem[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return apiFetch<EmployeeListItem[]>(qs ? `${BASE}?${qs}` : BASE);
}
