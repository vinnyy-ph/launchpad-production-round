import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type {
  ListEmployeesQueryDto,
  UpdateEmployeeAddressRequestDto,
  UpdateEmployeeEmergencyContactRequestDto,
  UpdateEmployeeProfileRequestDto,
} from "./dto";

const EMPLOYEE_DIRECTORY_ROLES: Role[] = ["HR", "EMPLOYEE"];

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
  address: {
    select: {
      address: true,
      city: true,
      province: true,
      country: true,
    },
  },
  emergencyContact: {
    select: {
      emergencyContactName: true,
      emergencyContactNumber: true,
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

type EmployeeProfileRecord = Prisma.EmployeeGetPayload<{
  include: typeof employeeProfileInclude;
}>;

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
          address: {
            select: {
              address: true,
              city: true,
              province: true,
              country: true,
            },
          },
          emergencyContact: {
            select: {
              emergencyContactName: true,
              emergencyContactNumber: true,
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
  async findById(employeeId: string): Promise<EmployeeProfileRecord | null> {
    return prisma.employee.findFirst({
      where: {
        id: employeeId,
        user: {
          role: {
            in: EMPLOYEE_DIRECTORY_ROLES,
          },
        },
      },
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

    const addressUpdate = this.buildAddressRelationUpdate(
      update.address,
      Boolean(existingEmployee.address),
    );
    const emergencyContactUpdate = this.buildEmergencyContactRelationUpdate(
      update.emergencyContact,
      Boolean(existingEmployee.emergencyContact),
    );

    const data: Prisma.EmployeeUpdateInput = {
      companyEmail: update.companyEmail,
      firstName: update.firstName,
      lastName: update.lastName,
      middleName: update.middleName,
      personalEmail: update.personalEmail,
      birthday: update.birthday,
      jobTitle: update.jobTitle,
      status: update.status,
      ...(addressUpdate ? { address: addressUpdate } : {}),
      ...(emergencyContactUpdate ? { emergencyContact: emergencyContactUpdate } : {}),
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
    const where: Prisma.EmployeeWhereInput = {
      user: {
        role: {
          in: EMPLOYEE_DIRECTORY_ROLES,
        },
      },
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

  /** Builds the nested Prisma mutation for the optional one-to-one employee address. */
  private buildAddressRelationUpdate(
    address: UpdateEmployeeAddressRequestDto | null | undefined,
    hasExistingAddress: boolean,
  ): Prisma.EmployeeAddressUpdateOneWithoutEmployeeNestedInput | undefined {
    if (address === undefined) {
      return undefined;
    }

    if (address === null) {
      return hasExistingAddress ? { delete: true } : undefined;
    }

    return {
      upsert: {
        create: address,
        update: address,
      },
    };
  }

  /** Builds the nested Prisma mutation for the optional one-to-one emergency contact. */
  private buildEmergencyContactRelationUpdate(
    emergencyContact: UpdateEmployeeEmergencyContactRequestDto | null | undefined,
    hasExistingEmergencyContact: boolean,
  ): Prisma.EmployeeEmergencyContactUpdateOneWithoutEmployeeNestedInput | undefined {
    if (emergencyContact === undefined) {
      return undefined;
    }

    if (emergencyContact === null) {
      return hasExistingEmergencyContact ? { delete: true } : undefined;
    }

    return {
      upsert: {
        create: emergencyContact,
        update: emergencyContact,
      },
    };
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
