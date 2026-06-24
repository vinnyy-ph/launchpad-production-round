import type { Prisma } from "@prisma/client";
import { prisma } from "../../../core/database/prisma.service";

const documentInclude = {
  document: {
    select: {
      documentName: true,
    },
  },
} satisfies Prisma.OnboardingDocumentSubmissionInclude;

/**
 * Persistence layer for reading an employee's uploaded documents.
 * Documents link to an employee indirectly via their onboarding record.
 */
export class EmployeeDocumentsRepository {
  /**
   * Finds all document submissions belonging to one employee, newest first.
   */
  async findByEmployeeId(employeeId: string) {
    return prisma.onboardingDocumentSubmission.findMany({
      where: {
        record: { employeeId },
        status: "APPROVED",
      },
      orderBy: { submittedAt: "desc" },
      include: documentInclude,
    });
  }
}

export type EmployeeDocumentRecord = Awaited<
  ReturnType<EmployeeDocumentsRepository["findByEmployeeId"]>
>[number];
