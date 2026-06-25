import type { DocumentStatus } from "@prisma/client";
import type {
  EmployeeDocumentDto,
  EmployeeDocumentStatusDto,
  ListEmployeeDocumentsResponseDto,
} from "./dto";
import type { EmployeeDocumentRecord } from "./employee-documents.repository";
import { EmployeeDocumentsRepository } from "./employee-documents.repository";
import { CloudinaryService } from "../../../core/cloudinary";

/**
 * Business logic for listing an employee's uploaded documents in the HR directory profile.
 */
export class EmployeeDocumentsService {
  constructor(
    private readonly repository = new EmployeeDocumentsRepository(),
    private readonly cloudinaryService = new CloudinaryService(),
  ) {}

  /**
   * Returns the documents an employee has uploaded, mapped into directory-friendly DTOs.
   */
  async listEmployeeDocuments(employeeId: string): Promise<ListEmployeeDocumentsResponseDto> {
    const submissions = await this.repository.findByEmployeeId(employeeId);

    return {
      success: true,
      data: submissions.map((submission) => this.toEmployeeDocumentDto(submission)),
    };
  }

  /** Maps a submission record into the public document DTO shape. */
  private toEmployeeDocumentDto(submission: EmployeeDocumentRecord): EmployeeDocumentDto {
    return {
      id: submission.id,
      documentName: submission.document.documentName,
      fileUrl: this.cloudinaryService.resolveOnboardingDocumentViewUrl(
        submission.fileUrl,
      ),
      status: this.toStatusDto(submission.status),
      rejectionNote: submission.rejectionNote,
      submittedAt: submission.submittedAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    };
  }

  /** Maps Prisma's uppercase status enum to the lowercase API response contract. */
  private toStatusDto(status: DocumentStatus): EmployeeDocumentStatusDto {
    return status.toLowerCase() as EmployeeDocumentStatusDto;
  }
}
