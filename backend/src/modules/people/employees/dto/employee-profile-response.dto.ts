import type { ApiSuccessResponseDto } from "../../../../core/dto";
import type { EmployeeAddressResponseDto } from "./employee-address-response.dto";
import type { EmployeeDirectReportResponseDto } from "./employee-direct-report-response.dto";
import type { EmployeeEmergencyContactResponseDto } from "./employee-emergency-contact-response.dto";
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
  address: EmployeeAddressResponseDto | null;
  emergencyContact: EmployeeEmergencyContactResponseDto | null;
  jobTitle: string | null;
  department: string | null;
  status: EmployeeStatusDto;
  teams: EmployeeTeamResponseDto[];
  ledTeams: EmployeeLedTeamResponseDto[];
  supervisor: EmployeeSupervisorResponseDto | null;
  directReports: EmployeeDirectReportResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Redacted employee profile for viewers who are not HR, Admin, or the subject themselves.
 * Drops the sensitive fields (personalEmail, birthday, address, emergencyContact) server-side
 * so they never reach the payload. Keeps directory-safe identity, work, team, and supervisor data.
 */
export interface RedactedEmployeeProfileDto {
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
  ledTeams: EmployeeLedTeamResponseDto[];
  supervisor: EmployeeSupervisorResponseDto | null;
}

/**
 * Success envelope returned by GET /api/v1/employees/:employeeId.
 * HR/Admin/self receive the full profile; any other viewer receives the redacted profile.
 */
export type EmployeeProfileResponseDto = ApiSuccessResponseDto<
  EmployeeProfileDto | RedactedEmployeeProfileDto
>;
