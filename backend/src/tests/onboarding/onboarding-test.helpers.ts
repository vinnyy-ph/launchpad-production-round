import type { Role } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

export const SUPERVISOR_ID = "supervisor-employee-id";
export const HR_USER_ID = "hr-user-id";

export const mockedPrisma = jest.mocked(prisma);
export const userFindUniqueMock = mockedPrisma.user.findUnique as jest.Mock;
export const employeeFindFirstMock = mockedPrisma.employee.findFirst as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears all onboarding-related Prisma mocks before each test. */
export function resetOnboardingMocks() {
  userFindUniqueMock.mockReset();
  employeeFindFirstMock.mockReset();
  transactionMock.mockReset();
}

/** Minimal HR account injected by the auth mock for onboarding tests. */
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

/** Admin account used for testing that admins can also onboard. */
export function buildAdminUser() {
  return {
    id: "admin-user-id",
    email: "admin@example.com",
    googleId: null,
    role: "ADMIN" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Regular employee account for authorization tests. */
export function buildEmployeeUser() {
  return {
    id: "employee-user-id",
    email: "employee@example.com",
    googleId: null,
    role: "EMPLOYEE" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/** Valid onboarding request body for happy-path tests. */
export function buildOnboardBody() {
  return {
    companyEmail: "New.Hire@Example.com",
    jobTitle: "Software Engineer",
    supervisorId: SUPERVISOR_ID,
    department: "Engineering",
  };
}

/** Supervisor record returned by the findFirst mock. */
export function buildSupervisorRecord() {
  return {
    id: SUPERVISOR_ID,
    firstName: "Jane",
    lastName: "Manager",
  };
}

/**
 * Wires $transaction to simulate the full onboarding creation flow.
 * Returns a realistic result matching what the repository produces.
 */
export function mockOnboardingTransaction() {
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue({ id: "new-user-id" }),
      },
      employee: {
        create: jest.fn().mockResolvedValue({
          id: "new-employee-id",
          companyEmail: "new.hire@example.com",
          firstName: "new.hire",
          lastName: "",
          jobTitle: "Software Engineer",
          status: "ONBOARDING",
          department: { name: "Engineering" },
          supervisor: { id: SUPERVISOR_ID, firstName: "Jane", lastName: "Manager" },
        }),
      },
      onboardingTemplate: {
        findFirst: jest.fn().mockResolvedValue({ id: "template-id" }),
        upsert: jest.fn().mockResolvedValue({ id: "template-id", name: "Default", isDefault: true }),
      },
      onboardingRecord: {
        create: jest.fn().mockResolvedValue({
          id: "record-id",
          isComplete: false,
          createdAt: new Date("2026-06-17T00:00:00.000Z"),
        }),
      },
      onboardingInvitation: {
        create: jest.fn().mockResolvedValue({
          id: "invitation-id",
          sentToEmail: "new.hire@example.com",
          status: "PENDING",
          sentAt: new Date("2026-06-17T00:00:00.000Z"),
          expiresAt: new Date("2026-07-17T00:00:00.000Z"),
        }),
      },
    };

    return callback(tx);
  });
}
