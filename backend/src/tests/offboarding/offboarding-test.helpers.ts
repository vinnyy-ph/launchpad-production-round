import type { Role } from "@prisma/client";

export const HR_USER_ID = "hr-user-id";
export const HR_EMPLOYEE_ID = "hr-employee-id";
export const ADMIN_USER_ID = "admin-user-id";
export const SUPERVISOR_USER_ID = "supervisor-user-id";
export const SUPERVISOR_EMPLOYEE_ID = "supervisor-employee-id";
export const OFFBOARDEE_ID = "offboardee-employee-id";
export const TEMPLATE_ID = "template-id";
export const OFFBOARDING_ID = "offboarding-id";
export const NEW_SUPERVISOR_ID = "new-supervisor-id";

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

export function buildAdminUser() {
  return {
    id: ADMIN_USER_ID,
    email: "admin@example.com",
    googleId: null,
    role: "ADMIN" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

export function buildSupervisorUser() {
  return {
    id: SUPERVISOR_USER_ID,
    email: "supervisor@example.com",
    googleId: null,
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** A persisted offboarding record (with relations) as the detail include returns it. */
export function buildOffboardingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: OFFBOARDING_ID,
    employeeId: OFFBOARDEE_ID,
    clearanceTemplateId: TEMPLATE_ID,
    initiatedById: HR_EMPLOYEE_ID,
    status: "IN_PROGRESS",
    tenderDate: new Date("2026-06-01T00:00:00.000Z"),
    effectiveDate: new Date("2026-06-30T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    completedAt: null,
    employee: {
      id: OFFBOARDEE_ID,
      firstName: "Blake",
      lastName: "Rivera",
      jobTitle: "Engineer",
      department: { name: "Engineering" },
    },
    initiatedBy: {
      id: HR_EMPLOYEE_ID,
      firstName: "Darben",
      lastName: "HR",
    },
    signatureRequests: [
      {
        id: "req-1",
        signatoryId: "kurt-id",
        offboardingId: OFFBOARDING_ID,
        purpose: "Executive sign-off",
        requirements: "Confirm no assets remain.",
        status: "PENDING",
        note: null,
        actionAt: null,
        signatory: { id: "kurt-id", firstName: "Kurt", lastName: "Exec" },
      },
    ],
    attachments: [],
    ...overrides,
  };
}

/** Template signatories returned by clearanceSignatory.findMany. */
export function buildTemplateSignatories() {
  return [
    {
      employeeId: "kurt-id",
      purpose: "Executive sign-off",
      requirements: "Confirm no assets remain.",
      order: 1,
    },
    {
      employeeId: "thea-id",
      purpose: "Supervisor clearance",
      requirements: "Confirm handover.",
      order: 2,
    },
  ];
}
