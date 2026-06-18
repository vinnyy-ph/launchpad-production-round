/**
 * Public status values returned by the employees API.
 * Prisma stores these as uppercase enum values, but the API returns readable lowercase values.
 */
export type EmployeeStatusDto = "onboarding" | "active" | "offboarding" | "inactive";
