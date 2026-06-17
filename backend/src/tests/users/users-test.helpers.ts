import type { Role } from "@prisma/client";
import { prisma } from "../../core/database/prisma.service";

export const ADMIN_USER_ID = "admin-user-id";
export const TARGET_USER_ID = "target-user-id";

export const mockedPrisma = jest.mocked(prisma);
export const findManyMock = mockedPrisma.user.findMany as jest.Mock;
export const countMock = mockedPrisma.user.count as jest.Mock;
export const findUniqueMock = mockedPrisma.user.findUnique as jest.Mock;
export const updateMock = mockedPrisma.user.update as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears user Prisma mocks before each scenario so tests cannot leak state. */
export function resetUserMocks() {
  findManyMock.mockReset();
  countMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  transactionMock.mockReset();
}

/** Minimal admin account injected by the auth mock. */
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

/** Non-admin account used for authorization tests. */
export function buildHrUser() {
  return {
    id: "hr-user-id",
    email: "hr@example.com",
    googleId: null,
    role: "HR" as Role,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

/**
 * Builds a user record with linked employee data returned by user repository queries.
 */
export function buildUserRecord(overrides?: {
  id?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  employeeStatus?: "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE";
  employeeId?: string;
}) {
  const id = overrides?.id ?? TARGET_USER_ID;
  const firstName = overrides?.firstName ?? "Jane";
  const lastName = overrides?.lastName ?? "Doe";

  return {
    id,
    email: overrides?.email ?? "jane.doe@example.com",
    googleId: null,
    role: overrides?.role ?? ("HR" as Role),
    isActive: overrides?.isActive ?? true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    employee: {
      id: overrides?.employeeId ?? "employee-target",
      firstName,
      lastName,
      status: overrides?.employeeStatus ?? "ONBOARDING",
    },
  };
}

/** Wires $transaction to run the callback and return the created user record. */
export function mockCreateUserTransaction(userRecord = buildUserRecord()) {
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue({ id: userRecord.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(userRecord),
      },
      employee: {
        create: jest.fn().mockResolvedValue({ id: userRecord.employee.id }),
      },
    };

    return callback(tx);
  });
}
