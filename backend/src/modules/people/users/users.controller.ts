import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import type {
  CreateUserResponseDto,
  DeactivateUserResponseDto,
  ListUsersResponseDto,
} from "./dto";
import { USER_FIELDS } from "./users.constants";
import { UsersService } from "./users.service";
import { UsersValidation } from "./users.validation";

/**
 * HTTP controller for admin user management endpoints.
 */
export class UsersController {
  constructor(
    private readonly usersService = new UsersService(),
    private readonly usersValidation = new UsersValidation(),
  ) {}

  /**
   * Handles GET /api/v1/users for admin user directory views.
   */
  listUsers = async (
    req: Request,
    res: Response<ListUsersResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const filters = this.usersValidation.parseListFilters(req.query);
      const result = await this.usersService.listUsers(filters);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /**
   * Handles POST /api/v1/users to create a new HR or Employee account.
   */
  addUser = async (
    req: Request,
    res: Response<CreateUserResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.usersValidation.parseAddUserBody(req.body);
      const result = await this.usersService.addUser(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /**
   * Handles PATCH /api/v1/users/:userId/deactivate to soft-delete an account.
   */
  deactivateUser = async (
    req: Request,
    res: Response<DeactivateUserResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.usersValidation.parseUserIdParam(req.params);

      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const result = await this.usersService.deactivateUser(params.userId, req.user.id);

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

    if (error.message.endsWith("is required") || error.message.startsWith("Invalid ")) {
      const field = error.message.replace(" is required", "").replace("Invalid ", "");

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

    if (error.message === "Invalid user role") {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.INVALID_USER_ROLE,
        errorCode: API_ERROR_CODES.INVALID_USER_ROLE,
        errors: [
          {
            field: USER_FIELDS.ROLE,
            message: API_ERROR_MESSAGES.INVALID_USER_ROLE,
            code: API_ERROR_CODES.INVALID_USER_ROLE,
          },
        ],
      });
    }

    if (error.message === "User already exists") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.USER_ALREADY_EXISTS,
        errorCode: API_ERROR_CODES.USER_ALREADY_EXISTS,
        errors: [
          {
            field: USER_FIELDS.EMAIL,
            message: API_ERROR_MESSAGES.USER_ALREADY_EXISTS,
            code: API_ERROR_CODES.USER_ALREADY_EXISTS,
          },
        ],
      });
    }

    if (error.message === "User not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.USER_NOT_FOUND,
        errorCode: API_ERROR_CODES.USER_NOT_FOUND,
        errors: [
          {
            field: USER_FIELDS.USER_ID,
            message: API_ERROR_MESSAGES.USER_NOT_FOUND,
            code: API_ERROR_CODES.USER_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Cannot deactivate yourself") {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.CANNOT_DEACTIVATE_SELF,
        errorCode: API_ERROR_CODES.CANNOT_DEACTIVATE_SELF,
      });
    }

    if (error.message === "Cannot deactivate last admin") {
      return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: API_ERROR_MESSAGES.CANNOT_DEACTIVATE_LAST_ADMIN,
        errorCode: API_ERROR_CODES.CANNOT_DEACTIVATE_LAST_ADMIN,
      });
    }

    if (error.message === "User already deactivated") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.USER_ALREADY_DEACTIVATED,
        errorCode: API_ERROR_CODES.USER_ALREADY_DEACTIVATED,
      });
    }

    return next(error);
  }
}
