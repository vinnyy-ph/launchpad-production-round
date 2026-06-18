import type { EmployeeStatusDto } from "./employee-status.dto";

/**
 * Direct report summary included in an HR employee profile response.
 */
export interface EmployeeDirectReportResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  fullName: string;
  jobTitle: string | null;
  status: EmployeeStatusDto;
}
