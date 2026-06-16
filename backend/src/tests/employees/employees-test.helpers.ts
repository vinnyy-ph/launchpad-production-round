import { prisma } from "../../core/database/prisma.service";

// These mocks keep endpoint tests fast and deterministic by avoiding real database calls.
export const mockedPrisma = jest.mocked(prisma);
export const findManyMock = mockedPrisma.employee.findMany as jest.Mock;
export const countMock = mockedPrisma.employee.count as jest.Mock;

/** Clears employee Prisma mocks before each scenario so tests cannot leak state. */
export function resetEmployeeMocks() {
  findManyMock.mockReset();
  countMock.mockReset();
}

/**
 * Builds the subset of an employee Prisma record read by the employee list endpoint.
 * Keeping this fixture small makes each test focus on API behavior instead of full schema setup.
 */
export function buildEmployeeRecord(overrides: {
  id: string;
  firstName: string;
  lastName: string;
  status: "ONBOARDING" | "ACTIVE" | "OFFBOARDING" | "INACTIVE";
  teamName: string;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    companyEmail: string;
    jobTitle: string;
  };
}) {
  const teamSlug = overrides.teamName.toLowerCase();

  return {
    id: overrides.id,
    userId: `${overrides.id}-user`,
    companyEmail: `${overrides.firstName.toLowerCase()}.${overrides.lastName.toLowerCase()}@example.com`,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    middleName: null,
    jobTitle: "Software Engineer",
    department: "Technology",
    status: overrides.status,
    teamMemberships: [
      {
        team: {
          id: `team-${teamSlug}`,
          name: overrides.teamName,
        },
      },
    ],
    supervisor: overrides.supervisor ?? null,
  };
}
