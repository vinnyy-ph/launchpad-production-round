import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { DocumentReviewStatusDto } from "./document-review-status.dto";

/**
 * Employee summary included with each document submission for HR review.
 */
export interface DocumentReviewEmployeeDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  companyEmail: string;
  jobTitle: string | null;
}

/**
 * Single document submission returned by the document review API.
 */
export interface DocumentReviewDto {
  id: string;
  recordId: string;
  documentId: string;
  documentName: string;
  fileUrl: string;
  status: DocumentReviewStatusDto;
  rejectionNote: string | null;
  reviewerId: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  employee: DocumentReviewEmployeeDto;
}

/** Response for approve/reject and single-submission mutations. */
export type DocumentReviewResponseDto = ApiSuccessResponseDto<DocumentReviewDto>;
