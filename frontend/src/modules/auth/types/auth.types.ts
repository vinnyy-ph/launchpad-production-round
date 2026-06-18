export type Role = "ADMIN" | "HR" | "EMPLOYEE";
export type EmployeeStatus = "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE";

export interface AppUser {
  userId: string;
  employeeId: string;
  role: Role;
  isSupervisor: boolean;
  isActive: boolean;
  // Lifecycle status; drives the onboarding gate (ONBOARDING is locked into the wizard).
  employeeStatus: EmployeeStatus;
  email: string;
  displayName: string | null;
}
