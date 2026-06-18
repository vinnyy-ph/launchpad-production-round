import { prisma } from "../../core/database/prisma.service";

// These mocks keep team endpoint tests deterministic and independent from a real database.
export const mockedPrisma = jest.mocked(prisma);
export const teamFindManyMock = mockedPrisma.team.findMany as jest.Mock;
export const teamCountMock = mockedPrisma.team.count as jest.Mock;
export const teamFindUniqueMock = mockedPrisma.team.findUnique as jest.Mock;
export const teamCreateMock = mockedPrisma.team.create as jest.Mock;
export const teamUpdateMock = mockedPrisma.team.update as jest.Mock;
export const teamMemberCreateManyMock = mockedPrisma.teamMember.createMany as jest.Mock;
export const teamMemberDeleteManyMock = mockedPrisma.teamMember.deleteMany as jest.Mock;
export const employeeCountMock = mockedPrisma.employee.count as jest.Mock;
export const transactionMock = mockedPrisma.$transaction as jest.Mock;

/** Clears team-related Prisma mocks before each scenario so tests cannot leak state. */
export function resetTeamMocks() {
  teamFindManyMock.mockReset();
  teamCountMock.mockReset();
  teamFindUniqueMock.mockReset();
  teamCreateMock.mockReset();
  teamUpdateMock.mockReset();
  teamMemberCreateManyMock.mockReset();
  teamMemberDeleteManyMock.mockReset();
  employeeCountMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockResolvedValue([]);
}

/**
 * Builds the subset of a Prisma team record consumed by the team service.
 */
export function buildTeamRecord(overrides: {
  id?: string;
  name?: string;
  leaderId?: string;
  memberIds?: string[];
}) {
  const leaderId = overrides.leaderId ?? "employee-leader";
  const memberIds = overrides.memberIds ?? [leaderId, "employee-member-1"];

  return {
    id: overrides.id ?? "team-platform",
    name: overrides.name ?? "Platform",
    leaderId,
    leader: buildTeamEmployee(leaderId, "Avery", "Cole", "Engineering Manager"),
    members: memberIds.map((employeeId, index) => ({
      id: `membership-${index + 1}`,
      teamId: overrides.id ?? "team-platform",
      employeeId,
      joinedAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      createdAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      updatedAt: new Date(`2026-01-0${index + 1}T00:00:00.000Z`),
      employee:
        employeeId === leaderId
          ? buildTeamEmployee(leaderId, "Avery", "Cole", "Engineering Manager")
          : buildTeamEmployee(employeeId, `Member${index}`, "Example", "Software Engineer"),
    })),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}

/** Builds an employee summary embedded in team repository results. */
function buildTeamEmployee(id: string, firstName: string, lastName: string, jobTitle: string) {
  return {
    id,
    firstName,
    middleName: null,
    lastName,
    companyEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    jobTitle,
  };
}
