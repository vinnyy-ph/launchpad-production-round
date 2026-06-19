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
   * Counts directory employees with no supervisor, optionally excluding one employee.
   * Used to enforce the single-root-node constraint before clearing a supervisor assignment.
   */
  async countRootEmployees(excludeEmployeeId: string): Promise<number> {
    return prisma.employee.count({
      where: {
        supervisorId: null,
        id: { not: excludeEmployeeId },
        user: { role: { in: EMPLOYEE_DIRECTORY_ROLES } },
      },
    });
  }

  /**
   * Returns true if assigning proposedSupervisorId as the supervisor of employeeId would
   * create a cycle in the supervision tree. Walks upward from the proposed supervisor until
   * reaching a root (null supervisorId) or detecting employeeId in the chain.
   */
  async wouldCreateCycle(employeeId: string, proposedSupervisorId: string): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | null = proposedSupervisorId;

    while (currentId !== null) {
      if (currentId === employeeId) {
        return true;
      }

      // Guard against infinite loops caused by pre-existing cycles in the data.
      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      const node: { supervisorId: string | null } | null = await prisma.employee.findFirst({
        where: { id: currentId },
        select: { supervisorId: true },
      });

      currentId = node?.supervisorId ?? null;
    }

    return false;
  }

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
   * Also creates ActivityLog entries for each field that changed.
   */
  async updateProfile(employeeId: string, update: UpdateEmployeeProfileRequestDto, updatedBy: string) {
    const existingEmployee = await this.findById(employeeId);

    if (!existingEmployee) {
      return null;
    }

    // Resolve the editor's Employee record from the User ID so we can link the audit entry.
    const editor = await prisma.employee.findFirst({
      where: { userId: updatedBy },
      select: { id: true },
    });

    const diffs = await this.computeDiffs(existingEmployee, update);

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

    return prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id: employeeId },
        data,
        include: employeeProfileInclude,
      });

      if (editor && diffs.length > 0) {
        await tx.activityLog.createMany({
          data: diffs.map((diff) => ({
            editorId: editor.id,
            targetEmployeeId: employeeId,
            fieldName: diff.fieldName,
            oldValue: diff.oldValue,
            newValue: diff.newValue,
          })),
        });
      }

      return updated;
    });
  }

  /**
   * Computes the set of field-level changes between the existing profile and the update payload.
   * Only fields present in the update (not undefined) are compared.
   */
  private async computeDiffs(
    existing: EmployeeProfileRecord,
    update: UpdateEmployeeProfileRequestDto,
  ): Promise<Array<{ fieldName: string; oldValue: string | null; newValue: string | null }>> {
    const diffs: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];

    const track = (
      fieldName: string,
      oldVal: string | null | undefined,
      newVal: string | null | undefined,
    ) => {
      if (newVal === undefined) return;
      const oldStr = oldVal ?? null;
      const newStr = newVal ?? null;
      if (oldStr !== newStr) {
        diffs.push({ fieldName, oldValue: oldStr, newValue: newStr });
      }
    };

    track("firstName", existing.firstName, update.firstName);
    track("lastName", existing.lastName, update.lastName);
    track("middleName", existing.middleName, update.middleName);
    track("companyEmail", existing.companyEmail, update.companyEmail);
    track("personalEmail", existing.personalEmail, update.personalEmail);
    track("jobTitle", existing.jobTitle, update.jobTitle);
    track("status", existing.status, update.status);

    if (update.birthday !== undefined) {
      const toDateStr = (d: Date | null): string | null =>
        d ? d.toISOString().split("T")[0] : null;
      track("birthday", toDateStr(existing.birthday), update.birthday ? toDateStr(update.birthday) : null);
    }

    if (update.department !== undefined) {
      track("department", existing.department?.name ?? null, update.department);
    }

    if (update.supervisorId !== undefined) {
      const oldName = existing.supervisor
        ? `${existing.supervisor.firstName} ${existing.supervisor.lastName}`
        : null;
      let newName: string | null = null;
      if (update.supervisorId) {
        const newSupervisor = await prisma.employee.findFirst({
          where: { id: update.supervisorId },
          select: { firstName: true, lastName: true },
        });
        newName = newSupervisor ? `${newSupervisor.firstName} ${newSupervisor.lastName}` : null;
      }
      if (oldName !== newName) {
        diffs.push({ fieldName: "supervisor", oldValue: oldName, newValue: newName });
      }
    }

    if (update.address !== undefined) {
      if (update.address === null) {
        if (existing.address) {
          track("address.country", existing.address.country, null);
          track("address.province", existing.address.province, null);
          track("address.city", existing.address.city, null);
          track("address.address", existing.address.address, null);
        }
      } else {
        track("address.country", existing.address?.country ?? null, update.address.country);
        track("address.province", existing.address?.province ?? null, update.address.province);
        track("address.city", existing.address?.city ?? null, update.address.city);
        track("address.address", existing.address?.address ?? null, update.address.address);
      }
    }

    if (update.emergencyContact !== undefined) {
      if (update.emergencyContact === null) {
        if (existing.emergencyContact) {
          track("emergencyContact.name", existing.emergencyContact.emergencyContactName, null);
          track("emergencyContact.phone", existing.emergencyContact.emergencyContactNumber, null);
        }
      } else {
        track("emergencyContact.name", existing.emergencyContact?.emergencyContactName ?? null, update.emergencyContact.emergencyContactName);
        track("emergencyContact.phone", existing.emergencyContact?.emergencyContactNumber ?? null, update.emergencyContact.emergencyContactNumber);
      }
    }

    return diffs;
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

    if (filters.supervisorIds?.length) {
      // Single id stays a plain match; multiple ids match any of them.
      where.supervisorId =
        filters.supervisorIds.length === 1
          ? filters.supervisorIds[0]
          : { in: filters.supervisorIds };
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
