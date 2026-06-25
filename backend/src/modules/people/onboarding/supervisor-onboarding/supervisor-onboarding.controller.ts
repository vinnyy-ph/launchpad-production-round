import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type { SupervisorOnboardingStatusResponseDto } from "./dto";
import { SupervisorOnboardingService } from "./supervisor-onboarding.service";
import { SupervisorOnboardingValidation } from "./supervisor-onboarding.validation";

/**
 * HTTP controller for supervisor onboarding visibility endpoints.
 */
export class SupervisorOnboardingController {
  constructor(
    private readonly supervisorOnboardingService = new SupervisorOnboardingService(),
    private readonly supervisorOnboardingValidation = new SupervisorOnboardingValidation(),
  ) {}

  /** Handles GET /api/v1/supervisor-onboarding/status. */
  getOnboardingStatuses = async (
    req: Request,
    res: Response<SupervisorOnboardingStatusResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const query = this.supervisorOnboardingValidation.parseStatusQuery(req.query);
      const result = await this.supervisorOnboardingService.getOnboardingStatuses(
        req.user!,
        query,
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
      error.message.startsWith("Invalid ") ||
      error.message.endsWith("is required")
    ) {
      const field = error.message
        .replace("Invalid ", "")
        .replace(" is required", "");

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

    if (error.message === "Employee profile not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
        errorCode: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
        errors: [
          {
            field: "employee",
            message: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
            code: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
          },
        ],
      });
    }

    return next(error);
  }
}
