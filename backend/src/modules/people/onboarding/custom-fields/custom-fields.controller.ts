import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type {
  CustomFieldResponseDto,
  ListCustomFieldsResponseDto,
} from "./dto";
import { CUSTOM_FIELD_FIELDS } from "./custom-fields.constants";
import { CustomFieldsService } from "./custom-fields.service";
import { CustomFieldsValidation } from "./custom-fields.validation";

/**
 * HTTP controller for HR onboarding custom field endpoints.
 */
export class CustomFieldsController {
  constructor(
    private readonly customFieldsService = new CustomFieldsService(),
    private readonly customFieldsValidation = new CustomFieldsValidation(),
  ) {}

  /** Handles POST /api/v1/onboarding/custom-fields. */
  createCustomField = async (
    req: Request,
    res: Response<CustomFieldResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.customFieldsValidation.parseCreateBody(req.body);
      const result = await this.customFieldsService.createCustomField(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/onboarding/custom-fields. */
  listCustomFields = async (
    _req: Request,
    res: Response<ListCustomFieldsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.customFieldsService.listCustomFields();

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/onboarding/custom-fields/:id. */
  getCustomField = async (
    req: Request,
    res: Response<CustomFieldResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.customFieldsValidation.parseCustomFieldIdParam(
        req.params,
      );
      const result = await this.customFieldsService.getCustomField(params.id);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PUT /api/v1/onboarding/custom-fields/:id. */
  updateCustomField = async (
    req: Request,
    res: Response<CustomFieldResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.customFieldsValidation.parseCustomFieldIdParam(
        req.params,
      );
      const body = this.customFieldsValidation.parseUpdateBody(req.body);
      const result = await this.customFieldsService.updateCustomField(
        params.id,
        body,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles DELETE /api/v1/onboarding/custom-fields/:id. */
  deleteCustomField = async (
    req: Request,
    res: Response<CustomFieldResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.customFieldsValidation.parseCustomFieldIdParam(
        req.params,
      );
      const result = await this.customFieldsService.deleteCustomField(
        params.id,
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

    if (error.message === "Custom field not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.CUSTOM_FIELD_NOT_FOUND,
        errorCode: API_ERROR_CODES.CUSTOM_FIELD_NOT_FOUND,
        errors: [
          {
            field: CUSTOM_FIELD_FIELDS.ID,
            message: API_ERROR_MESSAGES.CUSTOM_FIELD_NOT_FOUND,
            code: API_ERROR_CODES.CUSTOM_FIELD_NOT_FOUND,
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
