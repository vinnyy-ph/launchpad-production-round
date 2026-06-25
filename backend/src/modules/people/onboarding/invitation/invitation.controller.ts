import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import type {
  InvitationListResponseDto,
  InvitationResponseDto,
} from "./dto";
import { INVITATION_FIELDS } from "./invitation.constants";
import { InvitationService } from "./invitation.service";
import { InvitationValidation } from "./invitation.validation";

/**
 * HTTP controller for HR onboarding invitation endpoints.
 */
export class InvitationController {
  constructor(
    private readonly invitationService = new InvitationService(),
    private readonly invitationValidation = new InvitationValidation(),
  ) {}

  /** Handles POST /api/v1/onboarding/invitations/:recordId/send. */
  sendInvitation = async (
    req: Request,
    res: Response<InvitationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.invitationValidation.parseRecordIdParam(req.params);
      const result = await this.invitationService.sendInvitation(params, req.user?.email);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/onboarding/invitations/:invitationId/resend. */
  resendInvitation = async (
    req: Request,
    res: Response<InvitationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.invitationValidation.parseInvitationIdParam(req.params);
      const result = await this.invitationService.resendInvitation(params, req.user?.email);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/onboarding/invitations/:invitationId/email. */
  updateInvitationEmail = async (
    req: Request,
    res: Response<InvitationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.invitationValidation.parseInvitationIdParam(req.params);
      const body = this.invitationValidation.parseUpdateEmailBody(req.body);
      const result = await this.invitationService.updateEmail(params, body, req.user?.email);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/onboarding/invitations/:recordId. */
  getInvitationStatus = async (
    req: Request,
    res: Response<InvitationListResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.invitationValidation.parseGetStatusParams(req.params);
      const result = await this.invitationService.getInvitationStatus(params);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps known invitation errors to consistent API error responses. */
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

    if (error.message === "Invalid email") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.INVALID_EMAIL,
        errorCode: API_ERROR_CODES.INVALID_EMAIL,
        errors: [
          {
            field: INVITATION_FIELDS.EMAIL,
            message: API_ERROR_MESSAGES.INVALID_EMAIL,
            code: API_ERROR_CODES.INVALID_EMAIL,
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
            field: INVITATION_FIELDS.RECORD_ID,
            message: API_ERROR_MESSAGES.ONBOARDING_RECORD_NOT_FOUND,
            code: API_ERROR_CODES.ONBOARDING_RECORD_NOT_FOUND,
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
            field: INVITATION_FIELDS.INVITATION_ID,
            message: API_ERROR_MESSAGES.INVITATION_NOT_FOUND,
            code: API_ERROR_CODES.INVITATION_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Invitation already accepted") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_ALREADY_ACCEPTED,
        errorCode: API_ERROR_CODES.INVITATION_ALREADY_ACCEPTED,
        errors: [
          {
            field: INVITATION_FIELDS.INVITATION_ID,
            message: API_ERROR_MESSAGES.INVITATION_ALREADY_ACCEPTED,
            code: API_ERROR_CODES.INVITATION_ALREADY_ACCEPTED,
          },
        ],
      });
    }

    if (error.message === "Invitation resend cooldown") {
      return res.status(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_RESEND_COOLDOWN,
        errorCode: API_ERROR_CODES.INVITATION_RESEND_COOLDOWN,
        errors: [
          {
            field: INVITATION_FIELDS.INVITATION_ID,
            message: API_ERROR_MESSAGES.INVITATION_RESEND_COOLDOWN,
            code: API_ERROR_CODES.INVITATION_RESEND_COOLDOWN,
          },
        ],
      });
    }

    if (error.message === "Invitation resend rate limited") {
      return res.status(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_RESEND_RATE_LIMITED,
        errorCode: API_ERROR_CODES.INVITATION_RESEND_RATE_LIMITED,
        errors: [
          {
            field: INVITATION_FIELDS.INVITATION_ID,
            message: API_ERROR_MESSAGES.INVITATION_RESEND_RATE_LIMITED,
            code: API_ERROR_CODES.INVITATION_RESEND_RATE_LIMITED,
          },
        ],
      });
    }

    if (error.message === "Account already created") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.ACCOUNT_ALREADY_CREATED,
        errorCode: API_ERROR_CODES.ACCOUNT_ALREADY_CREATED,
        errors: [
          {
            field: INVITATION_FIELDS.EMAIL,
            message: API_ERROR_MESSAGES.ACCOUNT_ALREADY_CREATED,
            code: API_ERROR_CODES.ACCOUNT_ALREADY_CREATED,
          },
        ],
      });
    }

    if (error.message === "Invitation delivery failed") {
      return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: API_ERROR_MESSAGES.INVITATION_DELIVERY_FAILED,
        errorCode: API_ERROR_CODES.INVITATION_DELIVERY_FAILED,
        errors: [
          {
            field: INVITATION_FIELDS.EMAIL,
            message: API_ERROR_MESSAGES.INVITATION_DELIVERY_FAILED,
            code: API_ERROR_CODES.INVITATION_DELIVERY_FAILED,
          },
        ],
      });
    }

    return next(error);
  }
}
