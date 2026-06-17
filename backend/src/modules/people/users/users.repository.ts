import type { Prisma, Role } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { ListUsersQueryDto } from "./dto";

const userWithEmployeeInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} satisfies Prisma.UserInclude;

/**
 * Handles user persistence queries and keeps Prisma-specific logic out of controllers.
 */
export class UsersRepository {
  /**
   * Creates a User and linked Employee record in one atomic transaction.
   */
  async createUserWithEmployee(data: {
    email: string;
    role: Role;
    firstName: string;
    lastName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          role: data.role,
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          companyEmail: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userWithEmployeeInclude,
      });
    });
  }

  /**
   * Finds one user with linked employee profile data.
   */
  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: userWithEmployeeInclude,
    });
  }

  /**
   * Lists users with optional filters and pagination metadata.
   */
  async findAll(filters: ListUsersQueryDto) {
    const where = this.buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: [{ createdAt: "desc" }],
        include: userWithEmployeeInclude,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Updates the account active flag without deleting any records.
   */
  async setActive(userId: string, isActive: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      include: userWithEmployeeInclude,
    });
  }

  /**
   * Updates a user's stored role.
   */
  async updateRole(userId: string, role: Role) {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      include: userWithEmployeeInclude,
    });
  }

  /**
   * Checks whether an account already exists for the given email.
   */
  async existsByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    return Boolean(user);
  }

  /**
   * Counts active admin accounts. Used to enforce the last-admin safety rule.
   */
  async countActiveAdmins() {
    return prisma.user.count({
      where: {
        role: "ADMIN",
        isActive: true,
      },
    });
  }

  private buildWhere(filters: ListUsersQueryDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.role = filters.role;
    }

    if (typeof filters.isActive === "boolean") {
      where.isActive = filters.isActive;
    } else if (!filters.includeDeactivated) {
      where.isActive = true;
    }

    return where;
  }
}
