import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../core/globals";
import type { NotificationPreferencesResponseDto } from "./dto";
import { NotificationPreferencesService } from "./notification-preferences.service";
import { NotificationPreferencesValidation } from "./notification-preferences.validation";

/**
 * HTTP controller for the authenticated user's notification preferences.
 */
export class NotificationPreferencesController {
  constructor(
    private readonly service = new NotificationPreferencesService(),
    private readonly validation = new NotificationPreferencesValidation(),
  ) {}

  /** Handles GET /api/v1/notifications/preferences. */
  getMyPreferences = async (
    req: Request,
    res: Response<NotificationPreferencesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.service.getForUser(req.user!);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/notifications/preferences. */
  updateMyPreferences = async (
    req: Request,
    res: Response<NotificationPreferencesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const data = this.validation.parseUpdateBody(req.body ?? {});
      const result = await this.service.updateForUser(req.user!, data);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps known preference errors to consistent API responses. */
  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) {
      return next(error);
    }

    if (error.message === "Employee profile not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
        errorCode: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
        errors: [
          {
            field: "userId",
            message: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
            code: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
          },
        ],
      });
    }

    if (
      error.message === "No notification preferences provided" ||
      error.message.endsWith("must be a boolean")
    ) {
      const field = error.message.endsWith("must be a boolean")
        ? error.message.replace(" must be a boolean", "")
        : "preferences";

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

    return next(error);
  }
}
