import type { EmployeeStatusDto } from "./employee-status.dto";
import type { EmployeeSupervisorResponseDto } from "./employee-supervisor-response.dto";
import type { EmployeeTeamResponseDto } from "./employee-team-response.dto";

/**
 * Employee row returned by GET /api/employees.
 * This DTO intentionally exposes only list-view fields instead of the raw database model.
 */
export interface EmployeeListItemResponseDto {
  id: string;
  userId: string;
  companyEmail: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatusDto;
  teams: EmployeeTeamResponseDto[];
  supervisor: EmployeeSupervisorResponseDto | null;
}
