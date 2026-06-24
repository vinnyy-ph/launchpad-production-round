import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type { DocumentResponseDto, ListDocumentsResponseDto } from "./dto";
import { DOCUMENT_FIELDS } from "./documents.constants";
import { DocumentsService } from "./documents.service";
import { DocumentsValidation } from "./documents.validation";

/**
 * HTTP controller for HR required onboarding document endpoints.
 */
export class DocumentsController {
  constructor(
    private readonly documentsService = new DocumentsService(),
    private readonly documentsValidation = new DocumentsValidation(),
  ) {}

  /** Handles POST /api/v1/onboarding/documents. */
  createDocument = async (
    req: Request,
    res: Response<DocumentResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.documentsValidation.parseCreateBody(req.body);
      const result = await this.documentsService.createDocument(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/onboarding/documents. */
  listDocuments = async (
    _req: Request,
    res: Response<ListDocumentsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.documentsService.listDocuments();

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/onboarding/documents/:id. */
  getDocument = async (
    req: Request,
    res: Response<DocumentResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.documentsValidation.parseDocumentIdParam(req.params);
      const result = await this.documentsService.getDocument(params.id);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PUT /api/v1/onboarding/documents/:id. */
  updateDocument = async (
    req: Request,
    res: Response<DocumentResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.documentsValidation.parseDocumentIdParam(req.params);
      const body = this.documentsValidation.parseUpdateBody(req.body);
      const result = await this.documentsService.updateDocument(params.id, body);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles DELETE /api/v1/onboarding/documents/:id. */
  deleteDocument = async (
    req: Request,
    res: Response<DocumentResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.documentsValidation.parseDocumentIdParam(req.params);
      const result = await this.documentsService.deleteDocument(params.id);

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
      error.message.startsWith("Invalid ") ||
      this.isTextValidationError(error.message)
    ) {
      const field = error.message
        .replace(" is required", "")
        .replace("Invalid ", "")
        .replace(/ must .*/, "");

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

    if (error.message === "Document not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.DOCUMENT_NOT_FOUND,
        errorCode: API_ERROR_CODES.DOCUMENT_NOT_FOUND,
        errors: [
          {
            field: DOCUMENT_FIELDS.ID,
            message: API_ERROR_MESSAGES.DOCUMENT_NOT_FOUND,
            code: API_ERROR_CODES.DOCUMENT_NOT_FOUND,
          },
        ],
      });
    }

    return next(error);
  }

  private isTextValidationError(message: string): boolean {
    return message.includes(" must be ") || message.includes(" must not contain ");
  }
}
