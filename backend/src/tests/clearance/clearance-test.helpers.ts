import type { Role } from "@prisma/client";

export const SIGNATORY_USER_ID = "signatory-user-id";
export const SIGNATORY_EMPLOYEE_ID = "signatory-employee-id";
export const OTHER_USER_ID = "other-user-id";
export const OTHER_EMPLOYEE_ID = "other-employee-id";
export const HR_USER_ID = "hr-user-id";
export const REQUEST_ID = "request-id";
export const OFFBOARDING_ID = "offboarding-id";
export const OFFBOARDEE_ID = "offboardee-employee-id";

export function buildSignatoryUser() {
  return {
    id: SIGNATORY_USER_ID,
    email: "signatory@example.com",
    googleId: null,
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildHrUser() {
  return {
    id: HR_USER_ID,
    email: "hr@example.com",
    googleId: null,
    role: "HR" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** A signature request (with offboarding context) as the include returns it. */
export function buildSignatureRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    offboardingId: OFFBOARDING_ID,
    signatoryId: SIGNATORY_EMPLOYEE_ID,
    purpose: "Supervisor clearance",
    requirements: "Confirm handover.",
    status: "PENDING",
    note: null,
    actionAt: null,
    offboarding: {
      id: OFFBOARDING_ID,
      status: "IN_PROGRESS",
      effectiveDate: new Date("2026-06-30T00:00:00.000Z"),
      employeeId: OFFBOARDEE_ID,
      employee: {
        id: OFFBOARDEE_ID,
        firstName: "Blake",
        lastName: "Rivera",
        jobTitle: "Engineer",
        department: { name: "Engineering" },
      },
    },
    ...overrides,
  };
}
