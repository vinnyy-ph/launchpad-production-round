import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import { API_ERROR_CODES, API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
import { DEPARTMENT_FIELDS } from "./departments.constants";
import { DepartmentsService } from "./departments.service";
import { DepartmentsValidation } from "./departments.validation";
import type {
  DepartmentMutationResponseDto,
  ListDepartmentsResponseDto,
} from "./dto";

/** Validation failures that map to a 400 Bad Request. */
const INVALID_DEPARTMENT_ERRORS = new Set([
  "Department name is required",
  "Department name is too long",
  "Department id is required",
]);

/** HTTP controller for department endpoints. Parses input, delegates, and maps errors. */
export class DepartmentsController {
  constructor(
    private readonly departmentsService = new DepartmentsService(),
    private readonly departmentsValidation = new DepartmentsValidation(),
  ) {}

  /** Handles GET /api/v1/departments — paginated, searchable, sortable department list. */
  listDepartments = async (
    req: Request,
    res: Response<ListDepartmentsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const filters = this.departmentsValidation.parseListFilters(req.query);
      const result = await this.departmentsService.listDepartments(filters);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /** Handles POST /api/v1/departments — creates a department. Restricted to HR and Admin. */
  createDepartment = async (
    req: Request,
    res: Response<DepartmentMutationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.departmentsValidation.parseCreateBody(req.body);
      const result = await this.departmentsService.createDepartment(body);
      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleMutationError(error, res, next);
    }
  };

  /** Handles PATCH /api/v1/departments/:departmentId — renames a department. HR and Admin. */
  updateDepartment = async (
    req: Request,
    res: Response<DepartmentMutationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.departmentsValidation.parseParams(req.params);
      const body = this.departmentsValidation.parseUpdateBody(req.body);
      const result = await this.departmentsService.updateDepartment(params, body);
      return res.json(result);
    } catch (error) {
      return this.handleMutationError(error, res, next);
    }
  };

  /** Handles DELETE /api/v1/departments/:departmentId — soft-deletes a department. HR and Admin. */
  deleteDepartment = async (
    req: Request,
    res: Response<DepartmentMutationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.departmentsValidation.parseParams(req.params);
      const result = await this.departmentsService.deleteDepartment(params);
      return res.json(result);
    } catch (error) {
      return this.handleMutationError(error, res, next);
    }
  };

  /** Maps known department write failures to their HTTP status and error envelope. */
  private handleMutationError(
    error: unknown,
    res: Response<DepartmentMutationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) {
      return next(error);
    }

    if (error.message === "Department not found") {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.DEPARTMENT_NOT_FOUND,
        errorCode: API_ERROR_CODES.DEPARTMENT_NOT_FOUND,
        errors: [
          {
            field: DEPARTMENT_FIELDS.DEPARTMENT_ID,
            message: API_ERROR_MESSAGES.DEPARTMENT_NOT_FOUND,
            code: API_ERROR_CODES.DEPARTMENT_NOT_FOUND,
          },
        ],
      });
    }

    if (error.message === "Department already exists") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.DEPARTMENT_ALREADY_EXISTS,
        errorCode: API_ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
        errors: [
          {
            field: DEPARTMENT_FIELDS.NAME,
            message: API_ERROR_MESSAGES.DEPARTMENT_ALREADY_EXISTS,
            code: API_ERROR_CODES.DEPARTMENT_ALREADY_EXISTS,
          },
        ],
      });
    }

    if (error.message === "Department has assigned employees") {
      return res.status(HTTP_STATUS_CODES.CONFLICT).json({
        success: false,
        message: API_ERROR_MESSAGES.DEPARTMENT_HAS_EMPLOYEES,
        errorCode: API_ERROR_CODES.DEPARTMENT_HAS_EMPLOYEES,
        errors: [
          {
            field: DEPARTMENT_FIELDS.DEPARTMENT_ID,
            message: API_ERROR_MESSAGES.DEPARTMENT_HAS_EMPLOYEES,
            code: API_ERROR_CODES.DEPARTMENT_HAS_EMPLOYEES,
          },
        ],
      });
    }

    if (INVALID_DEPARTMENT_ERRORS.has(error.message)) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.INVALID_DEPARTMENT,
        errorCode: API_ERROR_CODES.INVALID_DEPARTMENT,
        errors: [
          {
            field: DEPARTMENT_FIELDS.NAME,
            message: error.message,
            code: API_ERROR_CODES.INVALID_DEPARTMENT,
          },
        ],
      });
    }

    return next(error);
  }
}
