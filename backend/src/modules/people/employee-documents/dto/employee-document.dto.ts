import type { ApiSuccessResponseDto } from "../../../../core/dto";

/** Public status values for an employee's uploaded document. */
export type EmployeeDocumentStatusDto = "pending" | "approved" | "rejected";

/**
 * A single uploaded document belonging to an employee, surfaced in the HR directory profile.
 * Maps an OnboardingDocumentSubmission into a directory-friendly shape.
 */
export interface EmployeeDocumentDto {
  id: string;
  documentName: string;
  fileUrl: string;
  status: EmployeeDocumentStatusDto;
  rejectionNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** Response payload for listing one employee's uploaded documents. */
export type ListEmployeeDocumentsResponseDto = ApiSuccessResponseDto<EmployeeDocumentDto[]>;
