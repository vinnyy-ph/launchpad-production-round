import type { AppUser } from "./types/auth.types";

// Post-login landing route per role. Admins keep their user-management landing
// page; HR, supervisors, and employees land on the role-aware dashboard at "/".
// Supervisor is derived from the org graph (isSupervisor), not a stored role.
export function roleHome(user: AppUser): string {
  // A still-onboarding hire always lands in the wizard, never a dashboard.
  if (user.employeeStatus === "ONBOARDING") return "/employee/onboarding";
  if (user.role === "ADMIN") return "/admin/users";
  return "/";
}
