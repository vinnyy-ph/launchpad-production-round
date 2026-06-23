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
  /** Google profile picture URL; null when the account has no photo (UI falls back to initials). */
  avatarUrl: string | null;
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

/**
 * Fields an employee may edit on their OWN profile (PATCH /api/v1/employees/me). Excludes
 * HR-controlled fields (company email, job title, department, supervisor, status) by design.
 */
export interface MyProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  personalEmail?: string | null;
  birthday?: string | null;
  address?: EmployeeAddressInput | null;
  emergencyContact?: EmployeeEmergencyContactInput | null;
}

export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  /** Filter to employees in any of these statuses. */
  statuses?: EmployeeStatus[];
  teamId?: string;
  team?: string;
  /** Filter to employees in any of these teams. */
  teamIds?: string[];
  /** Filter to employees in any of these departments. */
  departmentIds?: string[];
  /** Filter to employees reporting to any of these supervisors. */
  supervisorIds?: string[];
  /** Scope to this supervisor's entire downward hierarchy (direct reports and everyone below). */
  reportingToId?: string;
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
