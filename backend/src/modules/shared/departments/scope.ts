// Department-scoped management rule, shared across People modules.
//
// Business rule: a manager (a supervisor or a team leader) may only manage people who
// belong to the SAME department. Employees with no department are EXEMPT — a null
// department on either side bypasses the check, so they can manage / be managed by anyone.

/**
 * Whether placing a manager with department `managerDepartmentId` over a member with
 * department `memberDepartmentId` would cross a department boundary (and is therefore
 * disallowed). Returns `false` (allowed) when either side has no department.
 */
export function crossesDepartment(
  memberDepartmentId: string | null | undefined,
  managerDepartmentId: string | null | undefined,
): boolean {
  if (!memberDepartmentId || !managerDepartmentId) return false;
  return memberDepartmentId !== managerDepartmentId;
}
