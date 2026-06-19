import { prisma } from "../../../core/database/prisma.service";

export class ActivityLogRepository {
  async findByTargetEmployee(employeeId: string) {
    return prisma.activityLog.findMany({
      where: { targetEmployeeId: employeeId },
      include: {
        editor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyEmail: true,
            jobTitle: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  }
}
