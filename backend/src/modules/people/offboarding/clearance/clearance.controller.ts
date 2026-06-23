import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../../core/globals";
import { ClearanceService } from "./clearance.service";
import { ClearanceValidation } from "./clearance.validation";
import type {
  AssignedClearancesResponseDto,
  ClearanceActionResponseDto,
  ClearanceTemplatesResponseDto,
} from "./dto";

/**
 * HTTP controller for the caller-as-signatory clearance endpoints.
 */
export class ClearanceController {
  constructor(
    private readonly clearanceService = new ClearanceService(),
    private readonly clearanceValidation = new ClearanceValidation(),
  ) {}

  /** Handles GET /api/v1/clearance/templates - HR/admin template options. */
  listTemplates = async (
    _req: Request,
    res: Response<ClearanceTemplatesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.clearanceService.listTemplates();

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles GET /api/v1/clearance/assigned — the caller's signature queue. */
  getAssignedClearances = async (
    req: Request,
    res: Response<AssignedClearancesResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const result = await this.clearanceService.getAssignedClearances(
        req.user!,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance/:requestId/sign. */
  signClearance = async (
    req: Request,
    res: Response<ClearanceActionResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { requestId } = this.clearanceValidation.parseRequestIdParam(
        req.params,
      );
      const { note } = this.clearanceValidation.parseSignBody(req.body);
      const result = await this.clearanceService.signClearance(
        req.user!,
        requestId,
        note,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance/:requestId/reject. */
  rejectClearance = async (
    req: Request,
    res: Response<ClearanceActionResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { requestId } = this.clearanceValidation.parseRequestIdParam(
        req.params,
      );
      const { note } = this.clearanceValidation.parseRejectBody(req.body);
      const result = await this.clearanceService.rejectClearance(
        req.user!,
        requestId,
        note,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance/:requestId/replace-signatory. ADMIN/HR. */
  replaceSignatory = async (
    req: Request,
    res: Response<ClearanceActionResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { requestId } = this.clearanceValidation.parseRequestIdParam(
        req.params,
      );
      const { newSignatoryId } = this.clearanceValidation.parseReplaceBody(
        req.body,
      );
      const result = await this.clearanceService.replaceSignatory(
        requestId,
        newSignatoryId,
      );

      return res.json(result);
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  /** Handles POST /api/v1/clearance/:requestId/reset. ADMIN/HR or the signatory. */
  resetClearance = async (
    req: Request,
    res: Response<ClearanceActionResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const { requestId } = this.clearanceValidation.parseRequestIdParam(
        req.params,
      );
      const result = await this.clearanceService.resetClearance(
        req.user!,
        requestId,
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

    if (error.message === "Rejection note required") {
      return this.fail(res, HTTP_STATUS_CODES.BAD_REQUEST, {
        field: "note",
        message: API_ERROR_MESSAGES.REJECTION_NOTE_REQUIRED,
        code: API_ERROR_CODES.REJECTION_NOTE_REQUIRED,
        topMessage: API_ERROR_MESSAGES.REJECTION_NOTE_REQUIRED,
        topCode: API_ERROR_CODES.REJECTION_NOTE_REQUIRED,
      });
    }

    if (error.message === "Employee profile not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "employee",
        message: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
        code: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.EMPLOYEE_PROFILE_NOT_FOUND,
        topCode: API_ERROR_CODES.EMPLOYEE_PROFILE_NOT_FOUND,
      });
    }

    if (error.message === "Signature request not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "requestId",
        message: API_ERROR_MESSAGES.SIGNATURE_REQUEST_NOT_FOUND,
        code: API_ERROR_CODES.SIGNATURE_REQUEST_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.SIGNATURE_REQUEST_NOT_FOUND,
        topCode: API_ERROR_CODES.SIGNATURE_REQUEST_NOT_FOUND,
      });
    }

    if (error.message === "Not clearance signatory") {
      return this.fail(res, HTTP_STATUS_CODES.FORBIDDEN, {
        field: "requestId",
        message: API_ERROR_MESSAGES.NOT_CLEARANCE_SIGNATORY,
        code: API_ERROR_CODES.NOT_CLEARANCE_SIGNATORY,
        topMessage: API_ERROR_MESSAGES.NOT_CLEARANCE_SIGNATORY,
        topCode: API_ERROR_CODES.NOT_CLEARANCE_SIGNATORY,
      });
    }

    if (error.message === "Signature request not pending") {
      return this.fail(res, HTTP_STATUS_CODES.CONFLICT, {
        field: "requestId",
        message: API_ERROR_MESSAGES.SIGNATURE_REQUEST_NOT_PENDING,
        code: API_ERROR_CODES.SIGNATURE_REQUEST_NOT_PENDING,
        topMessage: API_ERROR_MESSAGES.SIGNATURE_REQUEST_NOT_PENDING,
        topCode: API_ERROR_CODES.SIGNATURE_REQUEST_NOT_PENDING,
      });
    }

    if (error.message === "Offboarding not in progress") {
      return this.fail(res, HTTP_STATUS_CODES.CONFLICT, {
        field: "requestId",
        message: API_ERROR_MESSAGES.OFFBOARDING_NOT_IN_PROGRESS,
        code: API_ERROR_CODES.OFFBOARDING_NOT_IN_PROGRESS,
        topMessage: API_ERROR_MESSAGES.OFFBOARDING_NOT_IN_PROGRESS,
        topCode: API_ERROR_CODES.OFFBOARDING_NOT_IN_PROGRESS,
      });
    }

    if (error.message === "Signatory not found") {
      return this.fail(res, HTTP_STATUS_CODES.NOT_FOUND, {
        field: "newSignatoryId",
        message: API_ERROR_MESSAGES.SIGNATORY_NOT_FOUND,
        code: API_ERROR_CODES.SIGNATORY_NOT_FOUND,
        topMessage: API_ERROR_MESSAGES.SIGNATORY_NOT_FOUND,
        topCode: API_ERROR_CODES.SIGNATORY_NOT_FOUND,
      });
    }

    if (error.message === "Signatory already on clearance") {
      return this.fail(res, HTTP_STATUS_CODES.CONFLICT, {
        field: "newSignatoryId",
        message: API_ERROR_MESSAGES.SIGNATORY_ALREADY_ON_CLEARANCE,
        code: API_ERROR_CODES.SIGNATORY_ALREADY_ON_CLEARANCE,
        topMessage: API_ERROR_MESSAGES.SIGNATORY_ALREADY_ON_CLEARANCE,
        topCode: API_ERROR_CODES.SIGNATORY_ALREADY_ON_CLEARANCE,
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
