export type EmployeeStatus = "onboarding" | "active" | "offboarding" | "inactive";
export type EmployeeSortBy =
  | "employeeName"
  | "jobTitle"
  | "department"
  | "supervisor"
  | "teams"
  | "status";
export type SortDirection = "asc" | "desc";

export interface EmployeeTeam {
  id: string;
  name: string;
}

export interface EmployeeSupervisor {
  id: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  fullName: string;
  jobTitle: string | null;
}

/** A row in the HR directory list (GET /api/employees). Sensitive fields are not listed here. */
export interface EmployeeListItem {
  id: string;
  userId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
  department: string | null;
  teams: EmployeeTeam[];
  supervisor: EmployeeSupervisor | null;
  status: EmployeeStatus;
}

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  teamId?: string;
  team?: string;
  supervisorId?: string;
  sortBy?: EmployeeSortBy;
  sortDirection?: SortDirection;
  page?: number;
  limit?: number;
}

export interface EmployeeListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
