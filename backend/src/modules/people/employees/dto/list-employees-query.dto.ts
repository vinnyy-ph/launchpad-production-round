import type { EmployeeStatus } from "@prisma/client";

/**
 * Normalized query parameters supported by GET /api/employees.
 * Validation converts raw Express query values into this DTO before service logic runs.
 */
export interface ListEmployeesQueryDto {
  search?: string;
  status?: EmployeeStatus;
  teamId?: string;
  team?: string;
  supervisorId?: string;
  page: number;
  limit: number;
}
