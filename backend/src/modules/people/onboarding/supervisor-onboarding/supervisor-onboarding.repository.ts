import type { InviteStatus } from "@prisma/client";
import { prisma } from "../../../../core/database/prisma.service";

/**
 * Persistence layer for supervisor onboarding visibility.
 * All Prisma queries for this feature live here.
 */
export class SupervisorOnboardingRepository {
  /** Loads the employee profile linked to an auth user. */
  async findEmployeeByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  /**
   * Returns onboarding records for subordinate employees within the supervisor's hierarchy.
   */
  async findOnboardingStatusesByEmployeeIds(
    employeeIds: string[],
    options: { skip: number; take: number; status?: "onboarding" | "completed" },
  ) {
    if (employeeIds.length === 0) {
      return [];
    }

    const statusFilter =
      options.status === "completed"
        ? { isComplete: true }
        : options.status === "onboarding"
          ? { isComplete: false }
          : {};

    return prisma.onboardingRecord.findMany({
      where: {
        employeeId: { in: employeeIds },
        ...statusFilter,
      },
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
          },
        },
        template: {
          include: {
            documents: { where: { isRequired: true } },
            customFields: { where: { isRequired: true } },
          },
        },
        documentSubmissions: {
          orderBy: { submittedAt: "desc" },
        },
        customFieldValues: true,
        invitations: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    });
  }
}

export type SupervisorOnboardingRecord = Awaited<
  ReturnType<SupervisorOnboardingRepository["findOnboardingStatusesByEmployeeIds"]>
>[number];

/** Maps a Prisma invite status to the API lowercase shape. */
export function toInvitationStatusDto(
  status: InviteStatus,
): "pending" | "accepted" | "expired" | "failed_delivery" {
  return status.toLowerCase() as
    | "pending"
    | "accepted"
    | "expired"
    | "failed_delivery";
}
