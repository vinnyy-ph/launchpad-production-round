import type { Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

export const SUPERVISOR_USER_ID = "supervisor-user-id";
export const SUPERVISOR_EMPLOYEE_ID = "supervisor-employee-id";
export const SUBORDINATE_EMPLOYEE_ID = "subordinate-employee-id";
export const SUBORDINATE_RECORD_ID = "subordinate-record-id";
export const NON_SUPERVISOR_USER_ID = "non-supervisor-user-id";

export const mockedPrisma = jest.mocked(prisma);
export const employeeFindUniqueMock = mockedPrisma.employee.findUnique as jest.Mock;
export const employeeCountMock = mockedPrisma.employee.count as jest.Mock;
export const onboardingRecordFindManyMock =
  mockedPrisma.onboardingRecord.findMany as jest.Mock;

/** Clears supervisor onboarding Prisma mocks before each test. */
export function resetSupervisorOnboardingMocks() {
  employeeFindUniqueMock.mockReset();
  employeeCountMock.mockReset();
  onboardingRecordFindManyMock.mockReset();
}

/** Supervisor account injected by the auth mock. */
export function buildSupervisorUser() {
  return {
    id: SUPERVISOR_USER_ID,
    email: "carlos.reyes@company.com",
    googleId: "google-supervisor-uid",
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Non-supervisor employee account injected by the auth mock. */
export function buildNonSupervisorUser() {
  return {
    id: NON_SUPERVISOR_USER_ID,
    email: "maria.santos@company.com",
    googleId: "google-employee-uid",
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Builds a subordinate onboarding record returned by the repository. */
export function buildSubordinateOnboardingRecord(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: SUBORDINATE_RECORD_ID,
    employeeId: SUBORDINATE_EMPLOYEE_ID,
    templateId: "template-id",
    isComplete: false,
    completedAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    employee: {
      id: SUBORDINATE_EMPLOYEE_ID,
      firstName: "Maria",
      lastName: "Santos",
      jobTitle: "Software Engineer",
      department: { name: "Engineering" },
    },
    template: {
      documents: [
        { id: "doc-1", isRequired: true },
        { id: "doc-2", isRequired: true },
        { id: "doc-3", isRequired: true },
      ],
      customFields: [
        { id: "field-1", isRequired: true },
        { id: "field-2", isRequired: true },
      ],
    },
    documentSubmissions: [
      {
        id: "sub-1",
        documentId: "doc-1",
        status: "APPROVED",
        submittedAt: new Date("2026-06-10T00:00:00.000Z"),
      },
      {
        id: "sub-2",
        documentId: "doc-2",
        status: "PENDING",
        submittedAt: new Date("2026-06-11T00:00:00.000Z"),
      },
    ],
    customFieldValues: [{ id: "val-1", fieldId: "field-1", value: "Answer 1" }],
    invitations: [
      {
        id: "inv-1",
        status: "ACCEPTED",
        sentAt: new Date("2026-06-01T00:00:00.000Z"),
        expiresAt: new Date("2026-06-15T00:00:00.000Z"),
      },
    ],
    ...overrides,
  };
}

/** Configures mocks so the caller passes the supervisor middleware check. */
export function mockSupervisorAccess() {
  employeeFindUniqueMock.mockResolvedValue({ id: SUPERVISOR_EMPLOYEE_ID });
  employeeCountMock.mockResolvedValue(2);
}

/** Configures mocks so the caller fails the supervisor middleware check. */
export function mockNonSupervisorAccess() {
  employeeFindUniqueMock.mockResolvedValue({ id: "regular-employee-id" });
  employeeCountMock.mockResolvedValue(0);
}
