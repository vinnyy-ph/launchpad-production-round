import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import { API_ERROR_CODES, API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
import type {
  EmployeeProfileResponseDto,
  ListAllEmployeesResponseDto,
  ListEmployeesResponseDto,
  UpdateEmployeeProfileResponseDto,
} from "./dto";
import {
  EMPLOYEE_QUERY_FIELDS,
  EMPLOYEE_STATUS_FILTER_MESSAGE,
} from "./employees.constants";
import { EmployeesService } from "./employees.service";
import { EmployeesValidation } from "./employees.validation";

/**
 * HTTP controller for employee endpoints.
 * It keeps request parsing and response handling separate from business logic.
 */
export class EmployeesController {
  constructor(
    private readonly employeesService = new EmployeesService(),
    private readonly employeesValidation = new EmployeesValidation(),
  ) {}

  /**
   * Handles GET /api/employees with search, filtering, and pagination query parameters.
   */
  listEmployees = async (
    req: Request,
    res: Response<ListEmployeesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const filters = this.employeesValidation.parseListFilters(req.query);
      const result = await this.employeesService.listEmployees(filters, {
        userId: req.user.id,
        role: req.user.role,
      });

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid employee status") {
        const response: ApiErrorResponseDto = {
          success: false,
          message: API_ERROR_MESSAGES.INVALID_EMPLOYEE_STATUS,
          errorCode: API_ERROR_CODES.INVALID_EMPLOYEE_STATUS,
          errors: [
            {
              field: EMPLOYEE_QUERY_FIELDS.STATUS,
              message: EMPLOYEE_STATUS_FILTER_MESSAGE,
              code: API_ERROR_CODES.INVALID_ENUM_VALUE,
            },
          ],
        };

        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(response);
      }

      if (error instanceof Error && error.message === "Forbidden reporting scope") {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to view these reports",
        });
      }

      return next(error);
    }
  };

  /**
   * Handles GET /api/v1/employees/all — the entire directory, non-paginated, for the org chart.
   */
  listAllEmployees = async (
    req: Request,
    res: Response<ListAllEmployeesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const result = await this.employeesService.listAllEmployees({
        userId: req.user.id,
        role: req.user.role,
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Handles GET /api/employees/:employeeId for HR employee profile views.
   */
  getEmployeeProfile = async (
    req: Request,
    res: Response<EmployeeProfileResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const params = this.employeesValidation.parseProfileParams(req.params);
      const result = await this.employeesService.getEmployeeProfile(params, {
        userId: req.user.id,
        role: req.user.role,
      });

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Employee not found") {
        const response: ApiErrorResponseDto = {
          success: false,
          message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
          errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          errors: [
            {
              field: EMPLOYEE_QUERY_FIELDS.EMPLOYEE_ID,
              message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
              code: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
            },
          ],
        };

        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(response);
      }

      if (error instanceof Error && error.message === "Profile not accessible") {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to view this profile",
        });
      }

      return next(error);
    }
  };

  /**
   * Handles PATCH /api/employees/:employeeId for HR employee profile edits.
   */
  updateEmployeeProfile = async (
    req: Request,
    res: Response<UpdateEmployeeProfileResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.employeesValidation.parseUpdateProfileParams(req.params);
      const body = this.employeesValidation.parseUpdateProfileBody(req.body);
      const result = await this.employeesService.updateEmployeeProfile(
        params,
        body,
        req.user?.id,
      );

      return res.json(result);
    } catch (error) {
      return this.handleProfileUpdateError(error, res, next);
    }
  };

  /**
   * Handles PATCH /api/v1/employees/me — the caller editing their OWN profile (any role).
   * Only self-editable fields are accepted (enforced by the validation layer).
   */
  updateMyProfile = async (
    req: Request,
    res: Response<UpdateEmployeeProfileResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const body = this.employeesValidation.parseSelfUpdateProfileBody(req.body);
      const result = await this.employeesService.updateMyProfile(req.user.id, body);

      return res.json(result);
    } catch (error) {
      return this.handleProfileUpdateError(error, res, next);
    }
  };

  /** Maps profile-update failures (not-found + validation) to consistent HTTP responses. */
  private handleProfileUpdateError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (error instanceof Error && error.message === "Employee not found") {
      const response: ApiErrorResponseDto = {
        success: false,
        message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
        errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
        errors: [
          {
            field: EMPLOYEE_QUERY_FIELDS.EMPLOYEE_ID,
            message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
            code: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
          },
        ],
      };

      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(response);
    }

    if (
      error instanceof Error &&
      ([
          "Employee profile update body is required",
          "Employee cannot supervise themselves",
          "Supervisor not found",
          "Circular supervisory relationship detected",
          "Another employee is already the root node",
          "Supervisor must belong to the same department",
          "Invalid employee birthday",
          "Employee must meet the minimum employment age.",
          "Invalid employee profile update",
          "Invalid employee status",
        ].includes(error.message) ||
        this.isTextValidationError(error.message))
    ) {
      const response: ApiErrorResponseDto = {
        success: false,
        message: API_ERROR_MESSAGES.INVALID_EMPLOYEE_PROFILE_UPDATE,
        errorCode: API_ERROR_CODES.INVALID_EMPLOYEE_PROFILE_UPDATE,
        errors: [
          {
            field: this.resolveUpdateErrorField(error.message),
            message: error.message,
            code: API_ERROR_CODES.INVALID_EMPLOYEE_PROFILE_UPDATE,
          },
        ],
      };

      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(response);
    }

    return next(error);
  }

  /** Identifies shared free-text validation failures. */
  private isTextValidationError(message: string): boolean {
    return message.includes(" must be ") || message.includes(" must not contain ");
  }

  /** Maps known employee update validation failures to the field clients can correct. */
  private resolveUpdateErrorField(message: string) {
    if (message === "Invalid employee birthday" || message === "Employee must meet the minimum employment age.") {
      return EMPLOYEE_QUERY_FIELDS.BIRTHDAY;
    }

    if (
      message === "Employee cannot supervise themselves" ||
      message === "Supervisor not found" ||
      message === "Circular supervisory relationship detected" ||
      message === "Another employee is already the root node" ||
      message === "Supervisor must belong to the same department"
    ) {
      return EMPLOYEE_QUERY_FIELDS.SUPERVISOR_ID;
    }

    if (message === "Invalid employee status") {
      return EMPLOYEE_QUERY_FIELDS.STATUS;
    }

    return EMPLOYEE_QUERY_FIELDS.BODY;
  }
}
