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
  // Google profile picture URL from the signed-in Firebase account; null when the
  // account has no photo (the UI then falls back to the default initials avatar).
  avatarUrl: string | null;
}
