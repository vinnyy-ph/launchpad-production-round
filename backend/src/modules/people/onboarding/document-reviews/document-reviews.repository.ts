import type { DocumentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../../core/database/prisma.service";
import type { ListDocumentReviewsQueryDto } from "./dto";

const submissionInclude = {
  document: {
    select: {
      id: true,
      documentName: true,
    },
  },
  record: {
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          companyEmail: true,
          jobTitle: true,
        },
      },
    },
  },
} satisfies Prisma.OnboardingDocumentSubmissionInclude;

/**
 * Persistence layer for HR document submission reviews.
 */
export class DocumentReviewsRepository {
  /**
   * Finds the employee profile linked to an HR user account.
   */
  async findEmployeeByUserId(userId: string) {
    return prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
  }

  /**
   * Lists document submissions for HR review, optionally filtered by status.
   */
  async findSubmissions(filters: ListDocumentReviewsQueryDto) {
    return prisma.onboardingDocumentSubmission.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: [{ submittedAt: "desc" }],
      include: submissionInclude,
    });
  }

  /**
   * Finds one document submission by ID with employee and document details.
   */
  async findSubmissionById(submissionId: string) {
    return prisma.onboardingDocumentSubmission.findUnique({
      where: { id: submissionId },
      include: submissionInclude,
    });
  }

  /**
   * Marks a submission as approved and records the reviewing HR employee.
   */
  async approveSubmission(submissionId: string, reviewerId: string) {
    return prisma.onboardingDocumentSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        reviewerId,
        reviewedAt: new Date(),
        rejectionNote: null,
      },
      include: submissionInclude,
    });
  }

  /**
   * Marks a submission as rejected with a note and records the reviewing HR employee.
   */
  async rejectSubmission(
    submissionId: string,
    reviewerId: string,
    rejectionNote: string,
  ) {
    return prisma.onboardingDocumentSubmission.update({
      where: { id: submissionId },
      data: {
        status: "REJECTED",
        reviewerId,
        reviewedAt: new Date(),
        rejectionNote,
      },
      include: submissionInclude,
    });
  }
}

export type DocumentReviewSubmissionRecord = NonNullable<
  Awaited<ReturnType<DocumentReviewsRepository["findSubmissionById"]>>
>;
