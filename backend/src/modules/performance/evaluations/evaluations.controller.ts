import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  API_SUCCESS_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import { EVAL_ERROR_MESSAGES } from "./evaluations.constants";
import { handleCreateEvaluation, handleUpdateEvaluation } from "./evaluations.service";
import { validateCreateEvaluation, validateUpdateEvaluation } from "./evaluations.validation";

export class EvaluationsController {
  createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const input = validateCreateEvaluation(req.body);
      const evaluation = await handleCreateEvaluation(input, req.user.id);

      return res.status(HTTP_STATUS_CODES.CREATED).json({
        success: true,
        message: API_SUCCESS_MESSAGES.EVALUATION_CREATED,
        data: evaluation,
      });
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  updateEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { evaluationId } = req.params;
      const input = validateUpdateEvaluation(req.body);
      const evaluation = await handleUpdateEvaluation(evaluationId, input, req.user.id);

      return res.json({
        success: true,
        message: API_SUCCESS_MESSAGES.EVALUATION_UPDATED,
        data: evaluation,
      });
    } catch (error) {
      return this.handleError(error, res, next);
    }
  };

  private handleError(
    error: unknown,
    res: Response<ApiErrorResponseDto>,
    next: NextFunction,
  ) {
    if (!(error instanceof Error)) return next(error);

    if (
      error.message.endsWith("is required") ||
      error.message.startsWith("grade must") ||
      error.message.startsWith("send must") ||
      error.message.endsWith("must be a string") ||
      error.message === "Request body is required" ||
      error.message === "No fields provided to update"
    ) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: API_ERROR_MESSAGES.VALIDATION_FAILED,
        errorCode: API_ERROR_CODES.VALIDATION_FAILED,
        errors: [{ field: "", message: error.message, code: API_ERROR_CODES.VALIDATION_FAILED }],
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
        errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.REVIEWEE_NOT_FOUND) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.EMPLOYEE_NOT_FOUND,
        errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.NOT_DIRECT_SUPERVISOR) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.NOT_SUPERVISOR,
        errorCode: API_ERROR_CODES.NOT_SUPERVISOR,
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
      return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
        errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.NOT_REVIEWER) {
      return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
        success: false,
        message: API_ERROR_MESSAGES.NOT_EVALUATION_REVIEWER,
        errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
      });
    }

    if (error.message === EVAL_ERROR_MESSAGES.ALREADY_SENT) {
      return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: API_ERROR_MESSAGES.EVALUATION_ALREADY_SENT,
        errorCode: API_ERROR_CODES.EVALUATION_ALREADY_SENT,
      });
    }

    return next(error);
  }
}
