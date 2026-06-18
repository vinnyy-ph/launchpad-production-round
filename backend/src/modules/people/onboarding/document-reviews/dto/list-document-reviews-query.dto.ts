import type { DocumentStatus } from "@prisma/client";

/**
 * Normalized query parameters supported by GET /api/v1/onboarding/document-reviews.
 */
export interface ListDocumentReviewsQueryDto {
  status?: DocumentStatus;
}
