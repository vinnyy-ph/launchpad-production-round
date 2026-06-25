import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import { ClearanceTemplatesService } from "./clearance-templates.service";
import { ClearanceTemplatesValidation } from "./clearance-templates.validation";
import type {
  ClearanceTemplateResponseDto,
  ListClearanceTemplatesResponseDto,
} from "./dto";

/**
 * HTTP controller for HR-managed clearance version endpoints.
 * Keeps request parsing and error mapping out of the service.
 */
export class ClearanceTemplatesController {
  constructor(
    private readonly clearanceTemplatesService = new ClearanceTemplatesService(),
    private readonly clearanceTemplatesValidation = new ClearanceTemplatesValidation(),
  ) {}

  /** Handles GET /api/v1/clearance-templates — list versions. */
  listTemplates = async (
    _req: Request,
    res: Response<ListClearanceTemplatesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.clearanceTemplatesService.listTemplates();

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance-templates — create a version. */
  createTemplate = async (
    req: Request,
    res: Response<ClearanceTemplateResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.clearanceTemplatesValidation.parseCreateBody(req.body);
      const result = await this.clearanceTemplatesService.createTemplate(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PUT /api/v1/clearance-templates/:id — edit name + signatories. */
  updateTemplate = async (
    req: Request,
    res: Response<ClearanceTemplateResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = this.clearanceTemplatesValidation.parseIdParam(req.params);
      const body = this.clearanceTemplatesValidation.parseUpdateBody(req.body);
      const result = await this.clearanceTemplatesService.updateTemplate(id, body);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance-templates/:id/default — set as default. */
  setDefaultTemplate = async (
    req: Request,
    res: Response<ClearanceTemplateResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = this.clearanceTemplatesValidation.parseIdParam(req.params);
      const result = await this.clearanceTemplatesService.setDefaultTemplate(id);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles DELETE /api/v1/clearance-templates/:id — delete an unused version. */
  deleteTemplate = async (
    req: Request,
    res: Response<ClearanceTemplateResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = this.clearanceTemplatesValidation.parseIdParam(req.params);
      const result = await this.clearanceTemplatesService.deleteTemplate(id);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps service/validation errors to consistent HTTP error responses. */
  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) {
      return next(error);
    }

    if (error.message === "Clearance template requires signatory") {
      return this.fail(res, HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY, {
        field: "signatories",
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_REQUIRES_SIGNATORY,
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_REQUIRES_SIGNATORY,
      });
    }

    if (error.message === "Duplicate clearance signatory") {
      return this.fail(res, HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY, {
        field: "signatories",
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_DUPLICATE_SIGNATORY,
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_DUPLICATE_SIGNATORY,
      });
    }

    if (error.message === "Signatory not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "signatories",
        code: API_ERROR_CODES.SIGNATORY_NOT_FOUND,
        message: API_ERROR_MESSAGES.SIGNATORY_NOT_FOUND,
      });
    }

    if (error.message === "Clearance template not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "id",
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_NOT_FOUND,
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_NOT_FOUND,
      });
    }

    if (error.message === "Clearance template in use") {
      return this.fail(res, HTTP_STATUS_CODES.CONFLICT, {
        field: "id",
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_IN_USE,
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_IN_USE,
      });
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

      return this.fail(res, HTTP_STATUS_CODES.BAD_REQUEST, {
        field,
        code: API_ERROR_CODES.VALIDATION_FAILED,
        message: error.message,
      });
    }

    return next(error);
  }

  /** Identifies shared free-text validation failures. */
  private isTextValidationError(message: string): boolean {
    return message.includes(" must be ") || message.includes(" must not contain ");
  }

  /** Sends a standard error envelope. */
  private fail(
    res: Response<ApiErrorResponseDto>,
    status: number,
    opts: { field: string; code: string; message: string },
  ) {
    return res.status(status).json({
      success: false,
      message: opts.message,
      errorCode: opts.code,
      errors: [{ field: opts.field, message: opts.message, code: opts.code }],
    });
  }
}
