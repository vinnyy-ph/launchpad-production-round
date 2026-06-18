import { prisma } from "../../core/database/prisma.service";

// These mocks keep endpoint tests fast and deterministic by avoiding real database calls.
export const mockedPrisma = jest.mocked(prisma);
export const findManyMock = mockedPrisma.employee.findMany as jest.Mock;
export const countMock = mockedPrisma.employee.count as jest.Mock;
export const findFirstMock = mockedPrisma.employee.findFirst as jest.Mock;
export const updateMock = mockedPrisma.employee.update as jest.Mock;

/** Clears employee Prisma mocks before each scenario so tests cannot leak state. */
export function resetEmployeeMocks() {
  findManyMock.mockReset();
  countMock.mockReset();
  findFirstMock.mockReset();
  updateMock.mockReset();
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
    department: {
      id: "department-technology",
      name: "Technology",
    },
    address: {
      address: "123 Example Street",
      city: "Manila",
      province: "Metro Manila",
      country: "Philippines",
    },
    emergencyContact: {
      emergencyContactName: "Jamie Reed",
      emergencyContactNumber: "+1 555 0100",
    },
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

/**
 * Builds a full employee profile record returned by the single employee lookup query.
 */
export function buildEmployeeProfileRecord() {
  return {
    ...buildEmployeeRecord({
      id: "employee-active",
      firstName: "Marcus",
      lastName: "Reed",
      status: "ACTIVE",
      teamName: "Engineering",
      supervisor: {
        id: "supervisor-1",
        firstName: "Avery",
        lastName: "Cole",
        companyEmail: "avery.cole@example.com",
        jobTitle: "Engineering Manager",
      },
    }),
    birthday: new Date("1992-04-12T00:00:00.000Z"),
    personalEmail: "marcus.personal@example.com",
    address: {
      address: "123 Example Street",
      city: "Manila",
      province: "Metro Manila",
      country: "Philippines",
    },
    emergencyContact: {
      emergencyContactName: "Jamie Reed",
      emergencyContactNumber: "+1 555 0100",
    },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    user: {
      id: "employee-active-user",
      email: "marcus.reed@example.com",
      role: "EMPLOYEE",
      isActive: true,
    },
    ledTeams: [{ id: "team-platform", name: "Platform" }],
    directReports: [
      {
        id: "direct-report-1",
        firstName: "Taylor",
        lastName: "Ng",
        companyEmail: "taylor.ng@example.com",
        jobTitle: "Software Engineer",
        status: "ACTIVE",
      },
    ],
  };
}
