import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/**
 * Single required onboarding document returned by the API.
 */
export interface DocumentDto {
  id: string;
  documentName: string;
  instructions: string | null;
  allowedFileTypes: string;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Response for GET /api/v1/onboarding/documents/:id and mutation endpoints. */
export type DocumentResponseDto = ApiSuccessResponseDto<DocumentDto>;
