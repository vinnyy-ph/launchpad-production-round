
import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto, ApiSuccessResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import { BulkOnboardingService, BulkOnboardingValidationError } from "./bulk.service";
import type { BulkOnboardingCommitData, BulkOnboardingPreviewData } from "./bulk.types";
import { BulkOnboardingValidation } from "./bulk.validation";

export class BulkOnboardingController {
  constructor(
    private readonly bulkService = new BulkOnboardingService(),
    private readonly bulkValidation = new BulkOnboardingValidation(),
  ) {}

  preview = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<BulkOnboardingPreviewData> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const rows = this.bulkValidation.parseRows(req.body);
      const result = await this.bulkService.preview(rows);

      return res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Bulk onboarding preview generated successfully",
        data: result,
      });
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  commit = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<BulkOnboardingCommitData> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const rows = this.bulkValidation.parseRows(req.body);
      const result = await this.bulkService.commit(rows);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (error instanceof BulkOnboardingValidationError) {
      return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: error.preview.errors.map((rowError) => ({
          field: rowError.field,
          message: `Row ${rowError.rowNumber}: ${rowError.message}`,
          code: API_ERROR_CODES.VALIDATION_FAILED,
        })),
      });
    }

    if (!(error instanceof Error)) {
      return next(error);
    }

    if (
      error.message.endsWith("is required") ||
      error.message.startsWith("At least one row") ||
      error.message.startsWith("Bulk onboarding is limited") ||
      error.message.startsWith("Row ")
    ) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field: "rows",
            message: error.message,
            code: API_ERROR_CODES.VALIDATION_FAILED,
          },
        ],
      });
    }

    return next(error);
  }
}
