import type { AppUser } from "./types/auth.types";

// Post-login landing route per role. Each role opens directly in its primary
// workspace; plain employees land on the role-aware dashboard at "/".
// Supervisor is derived from the org graph (isSupervisor), not a stored role.
export function roleHome(user: AppUser): string {
  // A still-onboarding hire always lands in the wizard, never a dashboard.
  if (user.employeeStatus === "ONBOARDING") return "/employee/onboarding";
  if (user.role === "ADMIN") return "/admin/users";
  if (user.role === "HR") return "/hr/directory";
  if (user.isSupervisor) return "/supervisor/reports";
  return "/";
}
