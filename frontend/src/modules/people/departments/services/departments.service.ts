import { apiFetch } from "@/shared/lib/api-client";
import type { Department } from "../types/departments.types";

export interface DepartmentListResult {
  data: Department[];
}

/** Loads departments from the backend departments table. */
export async function getDepartments(): Promise<DepartmentListResult> {
  return apiFetch<DepartmentListResult>("/api/v1/departments");
}
