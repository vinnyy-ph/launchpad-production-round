
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { ListTeamsQueryDto } from "./dto";

const teamInclude = {
  leader: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      companyEmail: true,
      jobTitle: true,
    },
  },
  members: {
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          companyEmail: true,
          jobTitle: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  },
} satisfies Prisma.TeamInclude;

/**
 * Encapsulates team persistence and relation updates.
 */
export class TeamsRepository {
  /**
   * Lists a page of teams with leader and member summaries plus the total count.
   */
  async findMany(filters: ListTeamsQueryDto, memberId?: string | null) {
    const skip = (filters.page - 1) * filters.limit;

    // When a memberId is supplied (non-privileged callers), scope to teams that person belongs to
    // — as the leader or a member. Privileged callers pass no memberId and see every team.
    const where: Prisma.TeamWhereInput = memberId
      ? { OR: [{ leaderId: memberId }, { members: { some: { employeeId: memberId } } }] }
      : {};

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { name: "asc" },
        include: teamInclude,
      }),
      prisma.team.count({ where }),
    ]);

    return { teams, total };
  }

  /** Resolves the caller's employee id from their user id, for membership-scoped listing. */
  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const employee = await prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });

    return employee?.id ?? null;
  }

  /**
   * Finds one team by id with member relations.
   */
  async findById(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: teamInclude,
    });
  }

  /**
   * Counts employees by id so service rules can detect missing people before writing membership.
   */
  async countEmployeesByIds(employeeIds: string[]) {
    return prisma.employee.count({
      where: {
        id: {
          in: employeeIds,
        },
      },
    });
  }

  /**
   * Creates a team and member rows in one transaction.
   */
  async createTeam(name: string, leaderId: string, memberIds: string[]) {
    return prisma.team.create({
      data: {
        name,
        leaderId,
        members: {
          createMany: {
            data: memberIds.map((employeeId) => ({ employeeId })),
            skipDuplicates: true,
          },
        },
      },
      include: teamInclude,
    });
  }

  /**
   * Updates a team's display name and returns the refreshed team graph.
   */
  async updateName(teamId: string, name: string) {
    return prisma.team.update({
      where: { id: teamId },
      data: { name },
      include: teamInclude,
    });
  }

  /**
   * Adds employees to a team without duplicating existing memberships.
   */
  async addMembers(teamId: string, employeeIds: string[]) {
    await prisma.teamMember.createMany({
      data: employeeIds.map((employeeId) => ({ teamId, employeeId })),
      skipDuplicates: true,
    });

    return this.findById(teamId);
  }

  /**
   * Removes one employee membership from a team.
   */
  async removeMember(teamId: string, employeeId: string) {
    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        employeeId,
      },
    });

    return this.findById(teamId);
  }

  /**
   * Removes multiple employee memberships from a team.
   */
  async removeMembers(teamId: string, employeeIds: string[]) {
    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        employeeId: {
          in: employeeIds,
        },
      },
    });

    return this.findById(teamId);
  }

  /**
   * Replaces a team's members atomically.
   */
  async replaceMembers(teamId: string, memberIds: string[]) {
    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { teamId } }),
      prisma.teamMember.createMany({
        data: memberIds.map((employeeId) => ({ teamId, employeeId })),
        skipDuplicates: true,
      }),
    ]);

    return this.findById(teamId);
  }
}
