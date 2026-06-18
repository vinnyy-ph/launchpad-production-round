import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** One document submission returned to the employee. */
export interface DocumentSubmissionDto {
  id: string;
  documentId: string;
  documentName: string;
  fileUrl: string;
  status: "pending" | "approved" | "rejected";
  rejectionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/**
 * Success envelope returned by POST /api/v1/employee-onboarding/documents/:documentId/submit.
 */
export type SubmitDocumentResponseDto = ApiSuccessResponseDto<DocumentSubmissionDto>;
