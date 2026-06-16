import type { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { ListEmployeesQueryDto } from "./dto";

/**
 * Handles employee persistence queries and keeps Prisma-specific filtering out of controllers.
 */
export class EmployeesRepository {
  /**
   * Finds employees matching the list filters and returns the total count for pagination metadata.
   */
  async findMany(filters: ListEmployeesQueryDto) {
    const where = this.buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        include: {
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyEmail: true,
              jobTitle: true,
            },
          },
          teamMemberships: {
            where: { deletedAt: null },
            include: {
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return { employees, total };
  }

  /**
   * Finds one unredacted employee profile for HR views.
   * Soft-deleted employees and related records are excluded from the profile response.
   */
  async findById(employeeId: string) {
    return prisma.employee.findFirst({
      where: {
        id: employeeId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyEmail: true,
            jobTitle: true,
          },
        },
        directReports: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyEmail: true,
            jobTitle: true,
            status: true,
          },
        },
        ledTeams: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
          },
        },
        teamMemberships: {
          where: { deletedAt: null },
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Builds a soft-delete-aware Prisma where clause for search and filter behavior.
   */
  private buildWhere(filters: ListEmployeesQueryDto): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.supervisorId) {
      where.supervisorId = filters.supervisorId;
    }

    if (filters.search) {
      // Search covers identity and work-profile fields users commonly scan in employee lists.
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { middleName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { companyEmail: { contains: filters.search, mode: "insensitive" } },
        { personalEmail: { contains: filters.search, mode: "insensitive" } },
        { jobTitle: { contains: filters.search, mode: "insensitive" } },
        { department: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.teamId || filters.team) {
      where.teamMemberships = {
        some: {
          deletedAt: null,
          team: {
            deletedAt: null,
            ...(filters.teamId ? { id: filters.teamId } : {}),
            ...(filters.team ? { name: { contains: filters.team, mode: "insensitive" } } : {}),
          },
        },
      };
    }

    return where;
  }
}
