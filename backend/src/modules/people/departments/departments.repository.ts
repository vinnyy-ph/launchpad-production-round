import { prisma } from "../../../core/database/prisma.service";

/** Handles department persistence queries. */
export class DepartmentsRepository {
  /** Lists all departments ordered for dropdown display. */
  async findMany() {
    return prisma.department.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });
  }
}
