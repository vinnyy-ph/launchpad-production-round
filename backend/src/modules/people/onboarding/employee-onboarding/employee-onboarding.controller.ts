import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type {
  AcceptInvitationResponseDto,
  CompleteOnboardingResponseDto,
  OnboardingStatusResponseDto,
  SubmitCustomFieldsResponseDto,
  SubmitDocumentResponseDto,
  UpdateProfileResponseDto,
} from "./dto";
import { EMPLOYEE_ONBOARDING_FIELDS } from "./employee-onboarding.constants";
import { EmployeeOnboardingService } from "./employee-onboarding.service";
import { EmployeeOnboardingValidation } from "./employee-onboarding.validation";

/**
 * HTTP controller for employee self-service onboarding endpoints.
 */
export class EmployeeOnboardingController {
  constructor(
    private readonly employeeOnboardingService = new EmployeeOnboardingService(),
    private readonly employeeOnboardingValidation = new EmployeeOnboardingValidation(),
  ) {}

  /** Handles POST /api/v1/employee-onboarding/accept-invitation. */
  acceptInvitation = async (
    req: Request,
    res: Response<AcceptInvitationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.employeeOnboardingService.acceptInvitation(
        req.user!,
      );

      return res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/employee-onboarding/status. */
  getStatus = async (
    req: Request,
    res: Response<OnboardingStatusResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.employeeOnboardingService.getStatus(req.user!);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/employee-onboarding/profile. */
  updateProfile = async (
    req: Request,
    res: Response<UpdateProfileResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.employeeOnboardingValidation.parseUpdateProfileBody(
        req.body,
      );
      const result = await this.employeeOnboardingService.updateProfile(
        req.user!,
        body,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/employee-onboarding/custom-fields. */
  submitCustomFields = async (
    req: Request,
    res: Response<SubmitCustomFieldsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.employeeOnboardingValidation.parseSubmitCustomFieldsBody(
        req.body,
      );
      const result = await this.employeeOnboardingService.submitCustomFields(
        req.user!,
        body,
      );

      return res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/employee-onboarding/documents/:documentId/submit. */
  submitDocument = async (
    req: Request,
    res: Response<SubmitDocumentResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.employeeOnboardingValidation.parseSubmitDocumentParams(
        req.params,
      );

      if (!req.file) {
        throw new Error(`${EMPLOYEE_ONBOARDING_FIELDS.FILE} is required`);
      }

      const result = await this.employeeOnboardingService.submitDocument(
        req.user!,
        params,
        req.file,
      );

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/employee-onboarding/complete. */
  completeOnboarding = async (
    req: Request,
    res: Response<CompleteOnboardingResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.employeeOnboardingService.completeOnboarding(
        req.user!,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps known employee onboarding errors to consistent API responses. */
  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
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

    if (error.message === "Profile update body is required") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field: "body",
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
            field: EMPLOYEE_ONBOARDING_FIELDS.BIRTHDAY,
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
            field: EMPLOYEE_ONBOARDING_FIELDS.EMERGENCY_CONTACT,
            message: API_ERROR_MESSAGES.INVALID_EMERGENCY_CONTACT_PHONE,
            code: API_ERROR_CODES.INVALID_EMERGENCY_CONTACT_PHONE,
          },
        ],
      });
    }

    if (error.message === "Invalid fileUrl") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.FILE_URL,
            message: "fileUrl must be a valid http or https URL",
            code: API_ERROR_CODES.VALIDATION_FAILED,
          },
        ],
      });
    }

    if (error.message === "Cloudinary is not configured") {
      return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "File upload is not configured on the server",
      });
    }

    if (error.message === "Employee onboarding not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.EMPLOYEE_ONBOARDING_NOT_FOUND,
        errorCode: API_ERROR_CODES.EMPLOYEE_ONBOARDING_NOT_FOUND,
        errors: [
          {
            field: "userId",
            message: API_ERROR_MESSAGES.EMPLOYEE_ONBOARDING_NOT_FOUND,
            code: API_ERROR_CODES.EMPLOYEE_ONBOARDING_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Invitation not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_NOT_FOUND,
        errorCode: API_ERROR_CODES.INVITATION_NOT_FOUND,
        errors: [
          {
            field: "invitation",
            message: API_ERROR_MESSAGES.INVITATION_NOT_FOUND,
            code: API_ERROR_CODES.INVITATION_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Invitation expired") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_EXPIRED,
        errorCode: API_ERROR_CODES.INVITATION_EXPIRED,
        errors: [
          {
            field: "invitation",
            message: API_ERROR_MESSAGES.INVITATION_EXPIRED,
            code: API_ERROR_CODES.INVITATION_EXPIRED,
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

    if (error.message === "Emergency contact phone number is already in use") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
        errorCode: API_ERROR_CODES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.EMERGENCY_CONTACT,
            message: API_ERROR_MESSAGES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
            code: API_ERROR_CODES.EMERGENCY_CONTACT_PHONE_ALREADY_IN_USE,
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
            field: EMPLOYEE_ONBOARDING_FIELDS.DOCUMENT_ID,
            message: API_ERROR_MESSAGES.DOCUMENT_NOT_FOUND,
            code: API_ERROR_CODES.DOCUMENT_NOT_FOUND,
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
            field: EMPLOYEE_ONBOARDING_FIELDS.FIELD_ID,
            message: API_ERROR_MESSAGES.CUSTOM_FIELD_NOT_FOUND,
            code: API_ERROR_CODES.CUSTOM_FIELD_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Invalid file type") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.INVALID_FILE_TYPE,
        errorCode: API_ERROR_CODES.INVALID_FILE_TYPE,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.FILE,
            message: API_ERROR_MESSAGES.INVALID_FILE_TYPE,
            code: API_ERROR_CODES.INVALID_FILE_TYPE,
          },
        ],
      });
    }

    if (error.message === "Document submission not allowed") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.DOCUMENT_SUBMISSION_NOT_ALLOWED,
        errorCode: API_ERROR_CODES.DOCUMENT_SUBMISSION_NOT_ALLOWED,
        errors: [
          {
            field: EMPLOYEE_ONBOARDING_FIELDS.DOCUMENT_ID,
            message: API_ERROR_MESSAGES.DOCUMENT_SUBMISSION_NOT_ALLOWED,
            code: API_ERROR_CODES.DOCUMENT_SUBMISSION_NOT_ALLOWED,
          },
        ],
      });
    }

    if (error.message === "Onboarding incomplete") {
      return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: API_ERROR_MESSAGES.ONBOARDING_INCOMPLETE,
        errorCode: API_ERROR_CODES.ONBOARDING_INCOMPLETE,
        errors: [
          {
            field: "onboardingRecord",
            message: API_ERROR_MESSAGES.ONBOARDING_INCOMPLETE,
            code: API_ERROR_CODES.ONBOARDING_INCOMPLETE,
          },
        ],
      });
    }

    return next(error);
  }
}
