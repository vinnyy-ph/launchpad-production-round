/**
 * Compact supervisor payload included with each employee when a supervisor is assigned.
 */
export interface EmployeeSupervisorResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  fullName: string;
  jobTitle: string | null;
}
