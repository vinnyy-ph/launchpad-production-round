import type { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";
import type { ListDepartmentsQueryDto } from "./dto";

/** Fields selected for every department list/mutation result. */
const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { employees: true } },
} satisfies Prisma.DepartmentSelect;

/** Handles department persistence queries. Soft-deleted rows (deletedAt set) are excluded. */
export class DepartmentsRepository {
  /**
   * Lists active departments with search, sorting, and pagination, plus the assigned
   * employee count for each. Returns the page items and the total matching count.
   */
  async findMany(filters: ListDepartmentsQueryDto) {
    const where = this.buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: this.buildOrderBy(filters),
        select: DEPARTMENT_SELECT,
      }),
      prisma.department.count({ where }),
    ]);

    return { departments, total };
  }

  /** Finds one active department by id, or null when it does not exist / is soft-deleted. */
  async findById(id: string) {
    return prisma.department.findFirst({
      where: { id, deletedAt: null },
      select: DEPARTMENT_SELECT,
    });
  }

  /**
   * Finds a department by exact name regardless of soft-delete state.
   * Used to detect active-name conflicts and to restore a previously deleted department.
   */
  async findByName(name: string) {
    return prisma.department.findUnique({
      where: { name },
      select: { id: true, deletedAt: true },
    });
  }

  /** Returns the active department whose name case-insensitively matches, if any. */
  async findActiveByNameInsensitive(name: string, excludeId?: string) {
    return prisma.department.findFirst({
      where: {
        deletedAt: null,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  /** Creates a new department. */
  async create(name: string) {
    return prisma.department.create({
      data: { name },
      select: DEPARTMENT_SELECT,
    });
  }

  /** Restores a soft-deleted department, optionally renaming it to the requested casing. */
  async restore(id: string, name: string) {
    return prisma.department.update({
      where: { id },
      data: { name, deletedAt: null },
      select: DEPARTMENT_SELECT,
    });
  }

  /** Renames an active department. */
  async update(id: string, name: string) {
    return prisma.department.update({
      where: { id },
      data: { name },
      select: DEPARTMENT_SELECT,
    });
  }

  /** Marks a department as deleted without removing the row. */
  async softDelete(id: string) {
    return prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: DEPARTMENT_SELECT,
    });
  }

  /** Counts employees currently assigned to the department (the deletion guard). */
  async countEmployees(id: string): Promise<number> {
    return prisma.employee.count({ where: { departmentId: id } });
  }

  /** Builds the active-only filter, adding a case-insensitive name search when present. */
  private buildWhere(filters: ListDepartmentsQueryDto): Prisma.DepartmentWhereInput {
    const where: Prisma.DepartmentWhereInput = { deletedAt: null };

    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }

  /** Maps the sort DTO onto a Prisma orderBy, defaulting to name ascending. */
  private buildOrderBy(
    filters: ListDepartmentsQueryDto,
  ): Prisma.DepartmentOrderByWithRelationInput {
    const direction = filters.sortDirection ?? "asc";

    switch (filters.sortBy) {
      case "employeeCount":
        return { employees: { _count: direction } };
      case "createdAt":
        return { createdAt: direction };
      case "name":
      default:
        return { name: direction };
    }
  }
}
