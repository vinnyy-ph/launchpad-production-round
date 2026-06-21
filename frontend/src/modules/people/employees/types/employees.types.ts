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

export interface EmployeeAddress {
  address: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}

export interface EmployeeEmergencyContact {
  emergencyContactName: string | null;
  emergencyContactNumber: string | null;
}

/** A row in the HR directory list (GET /api/employees). */
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
  address: EmployeeAddress | null;
  emergencyContact: EmployeeEmergencyContact | null;
  teams: EmployeeTeam[];
  supervisor: EmployeeSupervisor | null;
  status: EmployeeStatus;
}

export interface EmployeeUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface EmployeeDirectReport {
  id: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  fullName: string;
  jobTitle: string | null;
  status: EmployeeStatus;
}

/**
 * Employee profile (GET /api/v1/employees/:id). The endpoint returns a UNION: HR/Admin/self get
 * the full profile, while any other viewer gets a redacted profile that OMITS personalEmail,
 * birthday, address, emergencyContact (and the account/audit fields). The sensitive and full-only
 * fields are typed optional so the UI handles both shapes — hide a section when its field is absent.
 */
export interface EmployeeProfile extends EmployeeListItem {
  user?: EmployeeUser;
  personalEmail?: string | null;
  birthday?: string | null;
  ledTeams: EmployeeTeam[];
  directReports?: EmployeeDirectReport[];
  createdAt?: string;
  updatedAt?: string;
}

/** Address fields HR can edit on a profile. Null clears the stored value. */
export interface EmployeeAddressInput {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
}

/** Emergency contact fields HR can edit on a profile. Null clears the stored value. */
export interface EmployeeEmergencyContactInput {
  emergencyContactName?: string | null;
  emergencyContactNumber?: string | null;
}

/**
 * Body for PATCH /api/v1/employees/:id (HR/Admin only). Every field is optional; only the
 * provided keys are updated. Nullable fields can be sent as null to clear the stored value.
 */
export interface EmployeeUpdateInput {
  companyEmail?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  personalEmail?: string | null;
  birthday?: string | null;
  address?: EmployeeAddressInput | null;
  emergencyContact?: EmployeeEmergencyContactInput | null;
  jobTitle?: string | null;
  department?: string | null;
  supervisorId?: string | null;
  status?: EmployeeStatus;
}

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  teamId?: string;
  team?: string;
  /** Filter to employees in any of these departments. */
  departmentIds?: string[];
  /** Filter to employees reporting to any of these supervisors. */
  supervisorIds?: string[];
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
