import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import type { OnboardEmployeeResponseDto } from "./dto";
import { ONBOARDING_FIELDS } from "./onboarding.constants";
import { OnboardingService } from "./onboarding.service";
import { OnboardingValidation } from "./onboarding.validation";

/**
 * HTTP controller for employee onboarding endpoints.
 * Keeps request parsing and response handling separate from business logic.
 */
export class OnboardingController {
  constructor(
    private readonly onboardingService = new OnboardingService(),
    private readonly onboardingValidation = new OnboardingValidation(),
  ) {}

  /**
   * Handles POST /api/v1/onboarding to create a new employee and start onboarding.
   */
  onboardEmployee = async (
    req: Request,
    res: Response<OnboardEmployeeResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.onboardingValidation.parseOnboardBody(req.body);
      const result = await this.onboardingService.onboardEmployee(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      if (!(error instanceof Error)) {
        return next(error);
      }

      if (error.message.endsWith("is required")) {
        const field = error.message.replace(" is required", "");

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

      if (error.message === "Employee already exists") {
        return res.status(HTTP_STATUS_CODES.CONFLICT).json({
          success: false,
          message: API_ERROR_MESSAGES.EMPLOYEE_ALREADY_EXISTS,
          errorCode: API_ERROR_CODES.EMPLOYEE_ALREADY_EXISTS,
          errors: [
            {
              field: ONBOARDING_FIELDS.COMPANY_EMAIL,
              message: API_ERROR_MESSAGES.EMPLOYEE_ALREADY_EXISTS,
              code: API_ERROR_CODES.EMPLOYEE_ALREADY_EXISTS,
            },
          ],
        });
      }

      if (error.message === "Supervisor not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.SUPERVISOR_NOT_FOUND,
          errorCode: API_ERROR_CODES.SUPERVISOR_NOT_FOUND,
          errors: [
            {
              field: ONBOARDING_FIELDS.SUPERVISOR_ID,
              message: API_ERROR_MESSAGES.SUPERVISOR_NOT_FOUND,
              code: API_ERROR_CODES.SUPERVISOR_NOT_FOUND,
            },
          ],
        });
      }

      return next(error);
    }
  };
}
