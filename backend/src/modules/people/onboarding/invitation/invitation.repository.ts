import type { InviteStatus } from "@prisma/client";
import { prisma } from "../../../../core/database/prisma.service";

/**
 * Handles onboarding invitation persistence queries.
 */
export class InvitationRepository {
  /**
   * Returns all invitations for an onboarding record, newest first.
   */
  async findByRecordId(recordId: string) {
    return prisma.onboardingInvitation.findMany({
      where: { recordId },
      orderBy: { sentAt: "desc" },
    });
  }

  /**
   * Returns the latest invitation for an onboarding record.
   */
  async findLatestByRecordId(recordId: string) {
    return prisma.onboardingInvitation.findFirst({
      where: { recordId },
      orderBy: { sentAt: "desc" },
    });
  }

  /** Finds one invitation by ID. */
  async findById(invitationId: string) {
    return prisma.onboardingInvitation.findFirst({
      where: { id: invitationId },
      include: {
        record: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    googleId: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Loads an onboarding record with employee and user for invitation workflows.
   */
  async findRecordWithEmployee(recordId: string) {
    return prisma.onboardingRecord.findFirst({
      where: { id: recordId },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                googleId: true,
              },
            },
          },
        },
        invitations: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    });
  }

  /** Creates a new invitation for an onboarding record. */
  async create(recordId: string, email: string, expiresAt: Date) {
    return prisma.onboardingInvitation.create({
      data: {
        recordId,
        sentToEmail: email,
        expiresAt,
      },
    });
  }

  /** Updates the destination email and resets the invitation to pending. */
  async updateEmail(invitationId: string, newEmail: string) {
    return prisma.onboardingInvitation.update({
      where: { id: invitationId },
      data: {
        sentToEmail: newEmail,
        status: "PENDING",
        sentAt: new Date(),
      },
    });
  }

  /** Marks an invitation as resent with a fresh sent timestamp. */
  async markResent(invitationId: string, expiresAt: Date) {
    return prisma.onboardingInvitation.update({
      where: { id: invitationId },
      data: {
        status: "PENDING",
        sentAt: new Date(),
        expiresAt,
      },
    });
  }

  /** Updates invitation status after a delivery attempt. */
  async updateStatus(invitationId: string, status: InviteStatus) {
    return prisma.onboardingInvitation.update({
      where: { id: invitationId },
      data: { status },
    });
  }

  /**
   * Updates the employee and user email when HR corrects an invitation address.
   */
  async updateEmployeeEmail(
    employeeId: string,
    userId: string,
    newEmail: string,
  ) {
    return prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
      }),
      prisma.employee.update({
        where: { id: employeeId },
        data: { companyEmail: newEmail },
      }),
    ]);
  }
}
