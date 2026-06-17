export type EmployeeStatus = "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE";

/** A row in the HR directory list (GET /api/employees). Sensitive fields are not listed here. */
export interface EmployeeListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyEmail: string;
  jobTitle: string | null;
  departmentName: string | null;
  supervisorName: string | null;
  employeeStatus: EmployeeStatus;
}

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
}
