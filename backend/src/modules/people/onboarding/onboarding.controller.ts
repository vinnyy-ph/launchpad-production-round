import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { ApiErrorResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import type { OnboardEmployeeResponseDto, HrCompleteOnboardingResponseDto } from "./dto";
import type { OnboardingStatusResponseDto } from "./employee-onboarding/dto";
import { EmployeeOnboardingService } from "./employee-onboarding/employee-onboarding.service";
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
    private readonly employeeOnboardingService = new EmployeeOnboardingService(),
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

      if (error.message === "Invalid birthday") {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
          errors: [
            {
              field: ONBOARDING_FIELDS.BIRTHDAY,
              message: error.message,
              code: API_ERROR_CODES.VALIDATION_FAILED,
            },
          ],
        });
      }

      if (error.message === "Invalid emergency contact phone number") {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.INVALID_EMERGENCY_CONTACT_PHONE,
          errorCode: API_ERROR_CODES.INVALID_EMERGENCY_CONTACT_PHONE,
          errors: [
            {
              field: ONBOARDING_FIELDS.EMERGENCY_CONTACT,
              message: API_ERROR_MESSAGES.INVALID_EMERGENCY_CONTACT_PHONE,
              code: API_ERROR_CODES.INVALID_EMERGENCY_CONTACT_PHONE,
            },
          ],
        });
      }

      if (error.message === "Emergency contact phone number is already in use") {
        return res.status(HTTP_STATUS_CODES.CONFLICT).json({
          success: false,
          message: API_ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
          errorCode: API_ERROR_CODES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
          errors: [
            {
              field: ONBOARDING_FIELDS.EMERGENCY_CONTACT,
              message: API_ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
              code: API_ERROR_CODES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
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

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
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

        if (error.code === "P2028") {
          return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: API_ERROR_MESSAGES.ONBOARDING_FAILED,
            errorCode: API_ERROR_CODES.ONBOARDING_FAILED,
          });
        }
      }

      return next(error);
    }
  };

  /**
   * Handles POST /api/v1/onboarding/:employeeId/complete.
   * Marks onboarding complete when all requirements are satisfied.
   */
  completeOnboarding = async (
    req: Request,
    res: Response<HrCompleteOnboardingResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.onboardingValidation.parseCompleteParams(req.params);
      const result = await this.onboardingService.completeOnboarding(
        params.employeeId,
      );

      return res.status(HTTP_STATUS_CODES.OK).json(result);
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

      if (error.message === "Onboarding record not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.ONBOARDING_RECORD_NOT_FOUND,
          errorCode: API_ERROR_CODES.ONBOARDING_RECORD_NOT_FOUND,
          errors: [
            {
              field: ONBOARDING_FIELDS.EMPLOYEE_ID,
              message: API_ERROR_MESSAGES.ONBOARDING_RECORD_NOT_FOUND,
              code: API_ERROR_CODES.ONBOARDING_RECORD_NOT_FOUND,
            },
          ],
        });
      }

      if (error.message === "Onboarding already complete") {
        return res.status(HTTP_STATUS_CODES.CONFLICT).json({
          success: false,
          message: API_ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETE,
          errorCode: API_ERROR_CODES.ONBOARDING_ALREADY_COMPLETE,
          errors: [
            {
              field: "onboardingRecord",
              message: API_ERROR_MESSAGES.ONBOARDING_ALREADY_COMPLETE,
              code: API_ERROR_CODES.ONBOARDING_ALREADY_COMPLETE,
            },
          ],
        });
      }

      if (error.message === "Onboarding not ready") {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.ONBOARDING_NOT_READY,
          errorCode: API_ERROR_CODES.ONBOARDING_NOT_READY,
          errors: [
            {
              field: "onboardingRecord",
              message: API_ERROR_MESSAGES.ONBOARDING_NOT_READY,
              code: API_ERROR_CODES.ONBOARDING_NOT_READY,
            },
          ],
        });
      }

      return next(error);
    }
  };

  /**
   * Handles GET /api/v1/onboarding/:employeeId/status.
   * HR/Admin read of a specific new hire's onboarding checklist — including the
   * employee's custom-field answers and document submission statuses. Reuses the
   * same status builder as the employee-scoped view.
   */
  getStatus = async (
    req: Request,
    res: Response<OnboardingStatusResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.onboardingValidation.parseStatusParams(req.params);
      const result = await this.employeeOnboardingService.getStatusByEmployeeId(
        params.employeeId,
      );

      return res.status(HTTP_STATUS_CODES.OK).json(result);
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

      if (error.message === "Onboarding record not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.ONBOARDING_RECORD_NOT_FOUND,
          errorCode: API_ERROR_CODES.ONBOARDING_RECORD_NOT_FOUND,
          errors: [
            {
              field: ONBOARDING_FIELDS.EMPLOYEE_ID,
              message: API_ERROR_MESSAGES.ONBOARDING_RECORD_NOT_FOUND,
              code: API_ERROR_CODES.ONBOARDING_RECORD_NOT_FOUND,
            },
          ],
        });
      }

      return next(error);
    }
  };
}
