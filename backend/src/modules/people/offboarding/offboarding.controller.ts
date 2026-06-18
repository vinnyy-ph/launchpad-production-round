import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import type {
  MyOffboardingResponseDto,
  OffboardingDetailResponseDto,
  OffboardingListResponseDto,
  ReassignResponseDto,
} from "./dto";
import { OffboardingService } from "./offboarding.service";
import { OffboardingValidation } from "./offboarding.validation";

/**
 * HTTP controller for the offboarding lifecycle endpoints.
 * Keeps request parsing and error mapping out of the service.
 */
export class OffboardingController {
  constructor(
    private readonly offboardingService = new OffboardingService(),
    private readonly offboardingValidation = new OffboardingValidation(),
  ) {}

  /** Handles POST /api/v1/offboarding — initiate offboarding. ADMIN/HR. */
  initiateOffboarding = async (
    req: Request,
    res: Response<OffboardingDetailResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.offboardingValidation.parseInitiateBody(req.body);
      const result = await this.offboardingService.initiateOffboarding(
        req.user!,
        body,
      );

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/offboarding — list records (scoped by role). */
  listOffboardings = async (
    req: Request,
    res: Response<OffboardingListResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.offboardingService.listOffboardings(req.user!);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/offboarding/me — the caller's own record. */
  getMyOffboarding = async (
    req: Request,
    res: Response<MyOffboardingResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.offboardingService.getMyOffboarding(req.user!);

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/offboarding/:id — detail with authz. */
  getOffboardingById = async (
    req: Request,
    res: Response<OffboardingDetailResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = this.offboardingValidation.parseIdParam(req.params);
      const result = await this.offboardingService.getOffboardingById(
        req.user!,
        id,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/offboarding/:id/reassign — reassign reports + teams. ADMIN/HR. */
  reassignReports = async (
    req: Request,
    res: Response<ReassignResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { id } = this.offboardingValidation.parseIdParam(req.params);
      const body = this.offboardingValidation.parseReassignBody(req.body);
      const result = await this.offboardingService.reassignReports(
        id,
        body.newSupervisorId,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Maps service-layer errors to consistent HTTP error responses. */
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

      return this.fail(res, HTTP_STATUS_CODES.BAD_REQUEST, {
        field,
        message: error.message,
        code: API_ERROR_CODES.VALIDATION_FAILED,
        topMessage: API_ERROR_MESSAGES.VALIDATION_FAILED,
        topCode: API_ERROR_CODES.VALIDATION_FAILED,
      });
    }

    if (
      error.message === "Invalid tenderDate" ||
      error.message === "Invalid effectiveDate"
    ) {
      const field = error.message.replace("Invalid ", "");

      return this.fail(res, HTTP_STATUS_CODES.BAD_REQUEST, {
        field,
        message: error.message,
        code: API_ERROR_CODES.VALIDATION_FAILED,
        topMessage: API_ERROR_MESSAGES.VALIDATION_FAILED,
        topCode: API_ERROR_CODES.VALIDATION_FAILED,
      });
    }

    if (error.message === "Invalid effective date") {
      return this.fail(res, HTTP_STATUS_CODES.BAD_REQUEST, {
        field: "effectiveDate",
        message: API_ERROR_MESSAGES.INVALID_EFFECTIVE_DATE,
        code: API_ERROR_CODES.INVALID_EFFECTIVE_DATE,
        topMessage: API_ERROR_MESSAGES.INVALID_EFFECTIVE_DATE,
        topCode: API_ERROR_CODES.INVALID_EFFECTIVE_DATE,
      });
    }

    if (
      error.message === "Employee profile not found" ||
      error.message === "Employee not found"
    ) {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "employee",
        message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
        code: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
        topCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
      });
    }

    if (error.message === "Offboarding already exists") {
      return this.fail(res, HTTP_STATUS_CODES.CONFLICT, {
        field: "employeeId",
        message: API_ERROR_MESSAGES.OFFBOARDING_ALREADY_EXISTS,
        code: API_ERROR_CODES.OFFBOARDING_ALREADY_EXISTS,
        topMessage: API_ERROR_MESSAGES.OFFBOARDING_ALREADY_EXISTS,
        topCode: API_ERROR_CODES.OFFBOARDING_ALREADY_EXISTS,
      });
    }

    if (error.message === "Clearance template not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "clearanceTemplateId",
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_NOT_FOUND,
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_NOT_FOUND,
        topCode: API_ERROR_CODES.CLEARANCE_TEMPLATE_NOT_FOUND,
      });
    }

    if (error.message === "Clearance template has no signatories") {
      return this.fail(res, HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY, {
        field: "clearanceTemplateId",
        message: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_HAS_NO_SIGNATORIES,
        code: API_ERROR_CODES.CLEARANCE_TEMPLATE_HAS_NO_SIGNATORIES,
        topMessage: API_ERROR_MESSAGES.CLEARANCE_TEMPLATE_HAS_NO_SIGNATORIES,
        topCode: API_ERROR_CODES.CLEARANCE_TEMPLATE_HAS_NO_SIGNATORIES,
      });
    }

    if (error.message === "Reassignment target not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "newSupervisorId",
        message: API_ERROR_MESSAGES.REASSIGNMENT_TARGET_NOT_FOUND,
        code: API_ERROR_CODES.REASSIGNMENT_TARGET_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.REASSIGNMENT_TARGET_NOT_FOUND,
        topCode: API_ERROR_CODES.REASSIGNMENT_TARGET_NOT_FOUND,
      });
    }

    if (error.message === "Offboarding record not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "id",
        message: API_ERROR_MESSAGES.OFFBOARDING_RECORD_NOT_FOUND,
        code: API_ERROR_CODES.OFFBOARDING_RECORD_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.OFFBOARDING_RECORD_NOT_FOUND,
        topCode: API_ERROR_CODES.OFFBOARDING_RECORD_NOT_FOUND,
      });
    }

    if (error.message === "Forbidden") {
      return this.fail(res, HTTP_STATUS_CODES.FORBIDDEN, {
        field: "offboarding",
        message: API_ERROR_MESSAGES.FORBIDDEN,
        code: API_ERROR_CODES.FORBIDDEN,
        topMessage: API_ERROR_MESSAGES.FORBIDDEN,
        topCode: API_ERROR_CODES.FORBIDDEN,
      });
    }

    return next(error);
  }

  /** Sends a standard error envelope. */
  private fail(
    res: Response<ApiErrorResponseDto>,
    status: number,
    opts: {
      field: string;
      message: string;
      code: string;
      topMessage: string;
      topCode: string;
    },
  ) {
    return res.status(status).json({
      success: false,
      message: opts.topMessage,
      errorCode: opts.topCode,
      errors: [{ field: opts.field, message: opts.message, code: opts.code }],
    });
  }
}
