import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import { API_ERROR_CODES, API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
import type { ListEmployeesResponseDto } from "./dto";
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
}
