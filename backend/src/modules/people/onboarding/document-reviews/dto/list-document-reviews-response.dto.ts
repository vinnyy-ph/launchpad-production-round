import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { DocumentReviewDto } from "./document-review-response.dto";

/** Response for GET /api/v1/onboarding/document-reviews. */
export type ListDocumentReviewsResponseDto = ApiSuccessResponseDto<DocumentReviewDto[]>;
