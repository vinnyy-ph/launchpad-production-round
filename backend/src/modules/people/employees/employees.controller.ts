import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import { API_ERROR_CODES, API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
import type {
  EmployeeProfileResponseDto,
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
      const filters = this.employeesValidation.parseListFilters(req.query);
      const result = await this.employeesService.listEmployees(filters);

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
      const params = this.employeesValidation.parseProfileParams(req.params);
      const result = await this.employeesService.getEmployeeProfile(params);

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
        [
          "Employee profile update body is required",
          "Employee cannot supervise themselves",
          "Supervisor not found",
          "Circular supervisor relationship is not allowed",
          "Exactly one root employee is required",
          "Root employee must not have a supervisor",
          "Invalid employee birthday",
          "Invalid employee profile update",
          "Invalid employee status",
        ].includes(error.message)
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
  };

  /** Maps known employee update validation failures to the field clients can correct. */
  private resolveUpdateErrorField(message: string) {
    if (message === "Invalid employee birthday") {
      return EMPLOYEE_QUERY_FIELDS.BIRTHDAY;
    }

    if (
      [
        "Employee cannot supervise themselves",
        "Supervisor not found",
        "Circular supervisor relationship is not allowed",
        "Exactly one root employee is required",
        "Root employee must not have a supervisor",
      ].includes(message)
    ) {
      return EMPLOYEE_QUERY_FIELDS.SUPERVISOR_ID;
    }

    if (message === "Invalid employee status") {
      return EMPLOYEE_QUERY_FIELDS.STATUS;
    }

    return EMPLOYEE_QUERY_FIELDS.BODY;
  }
}
