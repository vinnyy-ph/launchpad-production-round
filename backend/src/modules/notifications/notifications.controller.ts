import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../core/globals";
import type {
  ListNotificationsResponseDto,
  MarkAsReadResponseDto,
} from "./dto";
import { NOTIFICATION_FIELDS } from "./notifications.constants";
import { NotificationsService } from "./notifications.service";
import { NotificationsValidation } from "./notifications.validation";

/**
 * HTTP controller for in-app notification endpoints.
 */
export class NotificationsController {
  constructor(
    private readonly notificationsService = new NotificationsService(),
    private readonly notificationsValidation = new NotificationsValidation(),
  ) {}

  /** Handles GET /api/v1/notifications. */
  getMyNotifications = async (
    req: Request,
    res: Response<ListNotificationsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const query = this.notificationsValidation.parseListQuery(req.query);
      const result = await this.notificationsService.getNotifications(
        req.user!,
        query,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/notifications/:notificationId/read. */
  markAsRead = async (
    req: Request,
    res: Response<MarkAsReadResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.notificationsValidation.parseMarkAsReadParams(req.params);
      const result = await this.notificationsService.markAsRead(
        req.user!,
        params.notificationId,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps known notification errors to consistent API responses. */
  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) {
      return next(error);
    }

    if (error.message === "Invalid limit") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [
          {
            field: NOTIFICATION_FIELDS.LIMIT,
            message: "limit must be a positive integer",
            code: API_ERROR_CODES.VALIDATION_FAILED,
          },
        ],
      });
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

    if (error.message === "Notification not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
        errorCode: API_ERROR_CODES.NOTIFICATION_NOT_FOUND,
        errors: [
          {
            field: NOTIFICATION_FIELDS.NOTIFICATION_ID,
            message: API_ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
            code: API_ERROR_CODES.NOTIFICATION_NOT_FOUND,
          },
        ],
      });
    }

    return next(error);
  }
}
