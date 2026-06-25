import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { DocumentDto } from "./document-response.dto";

/** Response for GET /api/v1/onboarding/documents. */
export type ListDocumentsResponseDto = ApiSuccessResponseDto<DocumentDto[]>;
