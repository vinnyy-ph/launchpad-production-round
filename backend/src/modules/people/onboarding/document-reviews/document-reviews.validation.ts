import { DocumentStatus } from "@prisma/client";
import type {
  ListDocumentReviewsQueryDto,
  RejectDocumentRequestDto,
  ReviewSubmissionParamsDto,
} from "./dto";
import { DOCUMENT_REVIEW_FIELDS } from "./document-reviews.constants";
import { assertSafeText } from "../../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../../people-text-limits";

/**
 * Validates and normalizes incoming document-review API payloads.
 */
export class DocumentReviewsValidation {
  /**
   * Validates GET /api/v1/onboarding/document-reviews query parameters.
   */
  parseListQuery(query: Record<string, unknown>): ListDocumentReviewsQueryDto {
    const status = this.parseDocumentStatus(query.status);

    return { status };
  }

  /**
   * Validates route params for approve/reject endpoints.
   */
  parseSubmissionIdParam(
    params: Record<string, unknown>,
  ): ReviewSubmissionParamsDto {
    const submissionId = this.parseRequiredString(
      params.submissionId,
      DOCUMENT_REVIEW_FIELDS.SUBMISSION_ID,
    );

    return { submissionId };
  }

  /**
   * Validates PATCH /api/v1/onboarding/document-reviews/:submissionId/reject body.
   */
  parseRejectBody(body: Record<string, unknown>): RejectDocumentRequestDto {
    const rejectionNote = this.parseRequiredString(
      body.rejectionNote,
      DOCUMENT_REVIEW_FIELDS.REJECTION_NOTE,
      PEOPLE_TEXT_LIMITS.NOTE,
    );

    return { rejectionNote };
  }

  private parseDocumentStatus(value: unknown): DocumentStatus | undefined {
    const status = this.parseOptionalString(value)?.toUpperCase();

    if (!status) {
      return undefined;
    }

    if (!Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      throw new Error(`Invalid ${DOCUMENT_REVIEW_FIELDS.STATUS}`);
    }

    return status as DocumentStatus;
  }

  private parseRequiredString(value: unknown, fieldName: string, maxLen?: number): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }

    const parsed = value.trim();
    if (maxLen !== undefined) {
      assertSafeText(parsed, fieldName, maxLen);
    }
    return parsed;
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }
}
