import type { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { ListEmployeesQueryDto, UpdateEmployeeProfileRequestDto } from "./dto";

const employeeProfileInclude = {
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
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  directReports: {
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
    select: {
      id: true,
      name: true,
    },
  },
  teamMemberships: {
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.EmployeeInclude;

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
    const orderBy = this.buildOrderBy(filters);

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy,
        include: {
          department: {
            select: {
              id: true,
              name: true,
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
          teamMemberships: {
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
   */
  async findById(employeeId: string) {
    return prisma.employee.findFirst({
      where: { id: employeeId },
      include: employeeProfileInclude,
    });
  }

  /**
   * Updates HR-editable employee profile fields and returns the refreshed unredacted profile.
   */
  async updateProfile(employeeId: string, update: UpdateEmployeeProfileRequestDto, updatedBy: string) {
    void updatedBy;
    const existingEmployee = await this.findById(employeeId);

    if (!existingEmployee) {
      return null;
    }

    const data: Prisma.EmployeeUpdateInput = {
      companyEmail: update.companyEmail,
      firstName: update.firstName,
      lastName: update.lastName,
      middleName: update.middleName,
      personalEmail: update.personalEmail,
      birthday: update.birthday,
      address: update.address,
      emergencyContact: update.emergencyContact,
      jobTitle: update.jobTitle,
      status: update.status,
      ...(update.department !== undefined
        ? {
            department: update.department
              ? {
                  connectOrCreate: {
                    where: { name: update.department },
                    create: { name: update.department },
                  },
                }
              : { disconnect: true },
          }
        : {}),
      ...(update.supervisorId !== undefined
        ? {
            supervisor: update.supervisorId
              ? { connect: { id: update.supervisorId } }
              : { disconnect: true },
          }
        : {}),
      ...(update.companyEmail
        ? {
            user: {
              update: {
                email: update.companyEmail,
              },
            },
          }
        : {}),
    };

    return prisma.employee.update({
      where: { id: employeeId },
      data,
      include: employeeProfileInclude,
    });
  }

  /**
   * Builds a Prisma where clause for search and filter behavior.
   */
  private buildWhere(filters: ListEmployeesQueryDto): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {};

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
        { department: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    if (filters.teamId || filters.team) {
      where.teamMemberships = {
        some: {
          team: {
            ...(filters.teamId ? { id: filters.teamId } : {}),
            ...(filters.team ? { name: { contains: filters.team, mode: "insensitive" } } : {}),
          },
        },
      };
    }

    return where;
  }

  /** Builds a stable order clause for employee directory sort controls. */
  private buildOrderBy(filters: ListEmployeesQueryDto): Prisma.EmployeeOrderByWithRelationInput[] {
    const direction = filters.sortDirection ?? "asc";
    const fallback: Prisma.EmployeeOrderByWithRelationInput[] = [
      { lastName: "asc" },
      { firstName: "asc" },
    ];

    switch (filters.sortBy) {
      case "jobTitle":
        return [{ jobTitle: direction }, ...fallback];
      case "department":
        return [{ department: { name: direction } }, ...fallback];
      case "supervisor":
        return [
          { supervisor: { lastName: direction } },
          { supervisor: { firstName: direction } },
          ...fallback,
        ];
      case "teams":
        return [{ teamMemberships: { _count: direction } }, ...fallback];
      case "status":
        return [{ status: direction }, ...fallback];
      case "employeeName":
      default:
        return [
          { lastName: direction },
          { firstName: direction },
        ];
    }
  }
}
