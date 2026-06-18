import type { DocumentStatus } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../../core/globals";
import type {
  DocumentReviewDto,
  DocumentReviewResponseDto,
  ListDocumentReviewsQueryDto,
  ListDocumentReviewsResponseDto,
  RejectDocumentRequestDto,
} from "./dto";
import type { DocumentReviewSubmissionRecord } from "./document-reviews.repository";
import { DocumentReviewsRepository } from "./document-reviews.repository";

/**
 * Business logic for HR review of employee onboarding document submissions.
 */
export class DocumentReviewsService {
  constructor(
    private readonly documentReviewsRepository = new DocumentReviewsRepository(),
  ) {}

  /**
   * Returns document submissions HR can review, optionally filtered by status.
   */
  async listDocumentReviews(
    filters: ListDocumentReviewsQueryDto,
  ): Promise<ListDocumentReviewsResponseDto> {
    const submissions =
      await this.documentReviewsRepository.findSubmissions(filters);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_REVIEWS_RETRIEVED,
      data: submissions.map((submission) => this.toDocumentReviewDto(submission)),
    };
  }

  /**
   * Approves a pending document submission.
   */
  async approveDocument(
    submissionId: string,
    reviewerUserId: string,
  ): Promise<DocumentReviewResponseDto> {
    const reviewerEmployeeId =
      await this.resolveReviewerEmployeeId(reviewerUserId);
    const submission =
      await this.documentReviewsRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    this.ensureSubmissionIsPending(submission.status);

    const updated = await this.documentReviewsRepository.approveSubmission(
      submissionId,
      reviewerEmployeeId,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_APPROVED,
      data: this.toDocumentReviewDto(updated),
    };
  }

  /**
   * Rejects a pending document submission with a note for the employee.
   */
  async rejectDocument(
    submissionId: string,
    reviewerUserId: string,
    dto: RejectDocumentRequestDto,
  ): Promise<DocumentReviewResponseDto> {
    const reviewerEmployeeId =
      await this.resolveReviewerEmployeeId(reviewerUserId);
    const submission =
      await this.documentReviewsRepository.findSubmissionById(submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    this.ensureSubmissionIsPending(submission.status);

    const updated = await this.documentReviewsRepository.rejectSubmission(
      submissionId,
      reviewerEmployeeId,
      dto.rejectionNote,
    );

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.DOCUMENT_REJECTED,
      data: this.toDocumentReviewDto(updated),
    };
  }

  /**
   * Resolves the employee ID for the reviewing HR user.
   */
  private async resolveReviewerEmployeeId(userId: string): Promise<string> {
    const employee =
      await this.documentReviewsRepository.findEmployeeByUserId(userId);

    if (!employee) {
      throw new Error("Reviewer employee not found");
    }

    return employee.id;
  }

  /**
   * Only pending submissions can be approved or rejected.
   */
  private ensureSubmissionIsPending(status: DocumentStatus) {
    if (status !== "PENDING") {
      throw new Error("Submission already reviewed");
    }
  }

  private toDocumentReviewDto(
    submission: DocumentReviewSubmissionRecord,
  ): DocumentReviewDto {
    const employee = submission.record.employee;

    return {
      id: submission.id,
      recordId: submission.recordId,
      documentId: submission.documentId,
      documentName: submission.document.documentName,
      fileUrl: submission.fileUrl,
      status: this.toStatusDto(submission.status),
      rejectionNote: submission.rejectionNote,
      reviewerId: submission.reviewerId,
      submittedAt: submission.submittedAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: this.buildFullName(
          employee.firstName,
          employee.middleName,
          employee.lastName,
        ),
        companyEmail: employee.companyEmail,
        jobTitle: employee.jobTitle,
      },
    };
  }

  private buildFullName(
    firstName: string,
    middleName: string | null,
    lastName: string,
  ): string {
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
  }

  private toStatusDto(
    status: DocumentStatus,
  ): DocumentReviewDto["status"] {
    return status.toLowerCase() as DocumentReviewDto["status"];
  }
}
