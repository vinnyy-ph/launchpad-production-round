import type { SignatoryStatus } from "@prisma/client";
import { prisma } from "../../../../core/database/prisma.service";

/** Includes the offboarding + offboardee context the clearance views need. */
const requestInclude = {
  offboarding: {
    select: {
      id: true,
      status: true,
      effectiveDate: true,
      employeeId: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
          department: { select: { name: true } },
          user: { select: { avatarUrl: true } },
        },
      },
    },
  },
} as const;

/**
 * Persistence layer for clearance signature requests.
 * All Prisma access for clearance signing lives here.
 */
export class ClearanceRepository {
  /** Lists clearance templates with signatory counts for HR selection. */
  async listTemplates() {
    return prisma.clearanceTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        isDefault: true,
        _count: { select: { signatories: true } },
      },
    });
  }

  /** Loads the employee profile linked to an auth user. */
  async findEmployeeByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  /** Loads an employee by id with the name fields needed for notifications. */
  async findEmployeeById(employeeId: string) {
    return prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  /**
   * Returns true when another signature request on the same offboarding is already
   * assigned to the given signatory (guards the unique [offboardingId, signatoryId]).
   */
  async signatoryHasRequestOnOffboarding(
    offboardingId: string,
    signatoryId: string,
    exceptRequestId: string,
  ): Promise<boolean> {
    const existing = await prisma.clearanceSignatureRequest.findFirst({
      where: {
        offboardingId,
        signatoryId,
        NOT: { id: exceptRequestId },
      },
      select: { id: true },
    });

    return existing !== null;
  }

  /**
   * Reassigns a signature request to a new signatory and resets it to PENDING,
   * clearing any prior note/sign so the new person starts fresh.
   */
  async replaceSignatory(requestId: string, newSignatoryId: string) {
    return prisma.clearanceSignatureRequest.update({
      where: { id: requestId },
      data: {
        signatoryId: newSignatoryId,
        status: "PENDING",
        note: null,
        actionAt: null,
      },
      include: requestInclude,
    });
  }

  /** Lists the signature requests assigned to a signatory, newest offboarding first. */
  async findAssignedBySignatoryId(signatoryId: string) {
    return prisma.clearanceSignatureRequest.findMany({
      where: { signatoryId },
      orderBy: { createdAt: "desc" },
      include: requestInclude,
    });
  }

  /** Loads one signature request with offboarding context. */
  async findRequestById(requestId: string) {
    return prisma.clearanceSignatureRequest.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
  }

  /** Updates the status (and note/actionAt) of one signature request. */
  async updateRequestStatus(
    requestId: string,
    status: SignatoryStatus,
    note: string | null,
    actionAt: Date | null,
  ) {
    return prisma.clearanceSignatureRequest.update({
      where: { id: requestId },
      data: { status, note, actionAt },
      include: requestInclude,
    });
  }

  /** Counts how many of an offboarding's signature requests are NOT yet signed. */
  async countUnsignedRequests(offboardingId: string): Promise<number> {
    return prisma.clearanceSignatureRequest.count({
      where: { offboardingId, NOT: { status: "SIGNED" } },
    });
  }

  /**
   * Completes the offboarding lifecycle atomically: marks the record COMPLETED and
   * flips the offboardee to INACTIVE. Called once all signature requests are SIGNED.
   */
  async completeOffboarding(offboardingId: string, employeeId: string) {
    const completedAt = new Date();

    return prisma.$transaction([
      prisma.offboardingRecord.update({
        where: { id: offboardingId },
        data: { status: "COMPLETED", completedAt },
      }),
      prisma.employee.update({
        where: { id: employeeId },
        data: { status: "INACTIVE" },
      }),
    ]);
  }
}
