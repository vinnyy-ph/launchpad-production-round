// Active-employee eligibility for Performance audiences and reminder targeting.
//
// An employee counts as "active" only when BOTH hold:
//   - their employee-status is ACTIVE, and
//   - their account is not deactivated.
// In this repo's schema the account flag lives on the related `User` (User.isActive);
// there is no `accountStatus` column on Employee. So the relation filter targets the user.

/**
 * Prisma `where` fragment. Spread into any employee query that must hit active employees
 * only, e.g. `prisma.employee.findMany({ where: { ...ACTIVE_EMPLOYEE } })`. Consumers get
 * full type-checking against the generated `Prisma.EmployeeWhereInput` at the call site.
 */
export const ACTIVE_EMPLOYEE = {
  status: "ACTIVE",
  user: { is: { isActive: true } },
} as const;

/** In-memory form of the same rule, for records already loaded with their user. */
export function isActiveEmployee(employee: {
  status: string;
  user?: { isActive: boolean } | null;
}): boolean {
  return employee.status === "ACTIVE" && employee.user?.isActive === true;
}
