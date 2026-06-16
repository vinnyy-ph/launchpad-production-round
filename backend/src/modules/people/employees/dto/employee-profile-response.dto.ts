import type { ApiSuccessResponseDto } from "../../../../core/dto";
import type { EmployeeDirectReportResponseDto } from "./employee-direct-report-response.dto";
import type { EmployeeLedTeamResponseDto } from "./employee-led-team-response.dto";
import type { EmployeeStatusDto } from "./employee-status.dto";
import type { EmployeeSupervisorResponseDto } from "./employee-supervisor-response.dto";
import type { EmployeeTeamResponseDto } from "./employee-team-response.dto";
import type { EmployeeUserResponseDto } from "./employee-user-response.dto";

/**
 * Full employee profile payload for HR views.
 * This response intentionally has no HR redaction and exposes profile, account, team, and reporting details.
 */
export interface EmployeeProfileDto {
  id: string;
  userId: string;
  user: EmployeeUserResponseDto;
  companyEmail: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  fullName: string;
  personalEmail: string | null;
  birthday: Date | null;
  address: string | null;
  emergencyContact: string | null;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatusDto;
  teams: EmployeeTeamResponseDto[];
  ledTeams: EmployeeLedTeamResponseDto[];
  supervisor: EmployeeSupervisorResponseDto | null;
  directReports: EmployeeDirectReportResponseDto[];
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/**
 * Success envelope returned by GET /api/v1/employees/:employeeId.
 */
export type EmployeeProfileResponseDto = ApiSuccessResponseDto<EmployeeProfileDto>;
