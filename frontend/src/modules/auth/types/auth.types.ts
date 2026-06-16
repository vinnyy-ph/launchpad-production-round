export type Role = "ADMIN" | "HR" | "EMPLOYEE";

export interface AppUser {
  userId: string;
  employeeId: string;
  role: Role;
  isSupervisor: boolean;
  isActive: boolean;
  email: string;
  displayName: string | null;
}
