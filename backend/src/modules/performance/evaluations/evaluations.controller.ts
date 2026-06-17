import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto, ApiSuccessResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  API_SUCCESS_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import { EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import type { EvaluationResponseDto, ListEvaluationsResponseDto } from "./dto";
import { EvaluationsService } from "./evaluations.service";
import { EvaluationsValidation } from "./evaluations.validation";

export class EvaluationsController {
  constructor(
    private readonly evaluationsService = new EvaluationsService(),
    private readonly evaluationsValidation = new EvaluationsValidation(),
  ) {}

  listEvaluations = async (
    req: Request,
    res: Response<ListEvaluationsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const query = this.evaluationsValidation.parseListQuery(req.query as Record<string, unknown>);
      const result = await this.evaluationsService.list(query, req.user);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (
        error instanceof Error &&
        (error.message.endsWith("is required") ||
          error.message === "status must be 'draft' or 'sent'")
      ) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
          errors: [{ field: "", message: error.message, code: API_ERROR_CODES.VALIDATION_FAILED }],
        });
      }

      return next(error);
    }
  };

  getEvaluation = async (
    req: Request,
    res: Response<EvaluationResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { evaluationId } = req.params;
      const result = await this.evaluationsService.get(evaluationId, req.user);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_AUTHORIZED) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.FORBIDDEN,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
        });
      }

      return next(error);
    }
  };

  createEvaluation = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<EvaluationResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const input = this.evaluationsValidation.parseCreateBody(req.body);
      const result = await this.evaluationsService.create(input, req.user.id);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      if (error instanceof Error && this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
          errors: [{ field: "", message: error.message, code: API_ERROR_CODES.VALIDATION_FAILED }],
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWEE_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
          errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_DIRECT_SUPERVISOR) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_SUPERVISOR,
          errorCode: API_ERROR_CODES.NOT_SUPERVISOR,
        });
      }

      return next(error);
    }
  };

  updateEvaluation = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<EvaluationResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { evaluationId } = req.params;
      const input = this.evaluationsValidation.parseUpdateBody(req.body);
      const result = await this.evaluationsService.update(evaluationId, input, req.user.id);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
          errors: [{ field: "", message: error.message, code: API_ERROR_CODES.VALIDATION_FAILED }],
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_REVIEWER) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_EVALUATION_REVIEWER,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.ALREADY_SENT) {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_ALREADY_SENT,
          errorCode: API_ERROR_CODES.EVALUATION_ALREADY_SENT,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWEE_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
          errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_DIRECT_SUPERVISOR) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_SUPERVISOR,
          errorCode: API_ERROR_CODES.NOT_SUPERVISOR,
        });
      }

      return next(error);
    }
  };

  deleteEvaluation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { evaluationId } = req.params;
      await this.evaluationsService.delete(evaluationId, req.user.id);

      return res.json({
        success: true,
        message: API_SUCCESS_MESSAGES.EVALUATION_DELETED,
      });
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_REVIEWER) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_EVALUATION_REVIEWER,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.ALREADY_SENT) {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_ALREADY_SENT,
          errorCode: API_ERROR_CODES.EVALUATION_ALREADY_SENT,
        });
      }

      return next(error);
    }
  };

  sendEvaluation = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { evaluationId } = req.params;
      const result = await this.evaluationsService.send(evaluationId, req.user.id);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_REVIEWER) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_EVALUATION_REVIEWER,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.ALREADY_SENT) {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_ALREADY_SENT,
          errorCode: API_ERROR_CODES.EVALUATION_ALREADY_SENT,
        });
      }

      return next(error);
    }
  };

  private isValidationError(error: Error): boolean {
    return (
      error.message.endsWith("is required") ||
      error.message.startsWith("grade must") ||
      error.message.startsWith("send must") ||
      error.message.endsWith("must be a string") ||
      error.message === "Request body is required" ||
      error.message === "No fields provided to update"
    );
  }
}
