import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type {
  DocumentReviewResponseDto,
  ListDocumentReviewsResponseDto,
} from "./dto";
import { DOCUMENT_REVIEW_FIELDS } from "./document-reviews.constants";
import { DocumentReviewsService } from "./document-reviews.service";
import { DocumentReviewsValidation } from "./document-reviews.validation";

/**
 * HTTP controller for HR document review endpoints.
 */
export class DocumentReviewsController {
  constructor(
    private readonly documentReviewsService = new DocumentReviewsService(),
    private readonly documentReviewsValidation = new DocumentReviewsValidation(),
  ) {}

  /** Handles GET /api/v1/onboarding/document-reviews. */
  listDocumentReviews = async (
    req: Request,
    res: Response<ListDocumentReviewsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const query = this.documentReviewsValidation.parseListQuery(req.query);
      const result = await this.documentReviewsService.listDocumentReviews(query);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/onboarding/document-reviews/:submissionId/approve. */
  approveDocument = async (
    req: Request,
    res: Response<DocumentReviewResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.documentReviewsValidation.parseSubmissionIdParam(
        req.params,
      );
      const result = await this.documentReviewsService.approveDocument(
        params.submissionId,
        req.user!.id,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/onboarding/document-reviews/:submissionId/reject. */
  rejectDocument = async (
    req: Request,
    res: Response<DocumentReviewResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.documentReviewsValidation.parseSubmissionIdParam(
        req.params,
      );
      const body = this.documentReviewsValidation.parseRejectBody(req.body);
      const result = await this.documentReviewsService.rejectDocument(
        params.submissionId,
        req.user!.id,
        body,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) {
      return next(error);
    }

    if (
      error.message.endsWith("is required") ||
      error.message.startsWith("Invalid ")
    ) {
      const field = error.message
        .replace(" is required", "")
        .replace("Invalid ", "");

      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field,
            message: error.message,
            code: API_ERROR_CODES.VALIDATION_FAILED,
          },
        ],
      });
    }

    if (error.message === "Submission not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.SUBMISSION_NOT_FOUND,
        errorCode: API_ERROR_CODES.SUBMISSION_NOT_FOUND,
        errors: [
          {
            field: DOCUMENT_REVIEW_FIELDS.SUBMISSION_ID,
            message: API_ERROR_MESSAGES.SUBMISSION_NOT_FOUND,
            code: API_ERROR_CODES.SUBMISSION_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Submission already reviewed") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED,
        errorCode: API_ERROR_CODES.SUBMISSION_ALREADY_REVIEWED,
        errors: [
          {
            field: DOCUMENT_REVIEW_FIELDS.SUBMISSION_ID,
            message: API_ERROR_MESSAGES.SUBMISSION_ALREADY_REVIEWED,
            code: API_ERROR_CODES.SUBMISSION_ALREADY_REVIEWED,
          },
        ],
      });
    }

    if (error.message === "Reviewer employee not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.REVIEWER_EMPLOYEE_NOT_FOUND,
        errorCode: API_ERROR_CODES.REVIEWER_EMPLOYEE_NOT_FOUND,
        errors: [
          {
            field: "reviewer",
            message: API_ERROR_MESSAGES.REVIEWER_EMPLOYEE_NOT_FOUND,
            code: API_ERROR_CODES.REVIEWER_EMPLOYEE_NOT_FOUND,
          },
        ],
      });
    }

    return next(error);
  }
}
