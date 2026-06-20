import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto, ApiSuccessResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  API_SUCCESS_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import { CloudinaryService } from "../../../core/cloudinary/cloudinary.service";
import { EVAL_ERROR_MESSAGES, EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";
import type { EvaluationResponseDto, ListEvaluationsResponseDto } from "./dto";
import { EvaluationsService } from "./evaluations.service";
import { EvaluationsValidation } from "./evaluations.validation";

export class EvaluationsController {
  constructor(
    private readonly evaluationsService = new EvaluationsService(),
    private readonly evaluationsValidation = new EvaluationsValidation(),
    private readonly cloudinaryService = new CloudinaryService(),
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

      const files = (req.files as Express.Multer.File[]) ?? [];
      let supportingDocUrls: string[] = [];
      try {
        supportingDocUrls = await Promise.all(
          files.map((f) => this.cloudinaryService.uploadSupportingDocument(f.buffer, f.originalname, f.mimetype)),
        );
      } catch (uploadError) {
        return next(uploadError);
      }

      const input = this.evaluationsValidation.parseCreateBody(req.body);
      const result = await this.evaluationsService.create({ ...input, supportingDocUrls }, req.user.id);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES ||
          (error as any).code === "LIMIT_FILE_COUNT"
        ) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
        if (
          error.message === EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE ||
          error.message === "Only PDF files are allowed"
        ) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
        if ((error as any).code === "LIMIT_FILE_SIZE") {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
      }

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

      const files = (req.files as Express.Multer.File[]) ?? [];
      let supportingDocUrls: string[] | undefined;
      if (files.length > 0) {
        try {
          supportingDocUrls = await Promise.all(
            files.map((f) => this.cloudinaryService.uploadSupportingDocument(f.buffer, f.originalname, f.mimetype)),
          );
        } catch (uploadError) {
          return next(uploadError);
        }
      }

      const input = this.evaluationsValidation.parseUpdateBody(req.body);
      const updateInput = supportingDocUrls !== undefined ? { ...input, supportingDocUrls } : input;
      const result = await this.evaluationsService.update(evaluationId, updateInput, req.user.id);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES ||
          (error as any).code === "LIMIT_FILE_COUNT"
        ) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
        if (
          error.message === EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE ||
          error.message === "Only PDF files are allowed"
        ) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
        if ((error as any).code === "LIMIT_FILE_SIZE") {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: "files", message: EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE, code: API_ERROR_CODES.VALIDATION_FAILED }],
          });
        }
      }

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

  acknowledgeEvaluation = async (
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
      const result = await this.evaluationsService.acknowledge(evaluationId, req.user.id);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWEE_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWEE_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWEE_NOT_EMPLOYEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.NOT_REVIEWEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.NOT_EVALUATION_REVIEWEE,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWEE,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_SENT) {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_SENT,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_SENT,
        });
      }

      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.ALREADY_ACKNOWLEDGED) {
        return res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_ALREADY_ACKNOWLEDGED,
          errorCode: API_ERROR_CODES.EVALUATION_ALREADY_ACKNOWLEDGED,
        });
      }

      return next(error);
    }
  };

  downloadDocument = async (
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

      const { evaluationId, docIndex } = req.params;

      // Reuse the same visibility/authorization rules as viewing the evaluation; the
      // client never supplies the public_id, so it can only reach docs it may already see.
      const evaluation = await this.evaluationsService.get(evaluationId, req.user);

      const index = Number(docIndex);
      const publicId = evaluation.supportingDocUrls[index];
      if (!Number.isInteger(index) || !publicId) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      const url = this.cloudinaryService.getSupportingDocumentDownloadUrl(publicId);
      return res.json({ url });
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.EVALUATION_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.EVALUATION_NOT_FOUND,
          errorCode: API_ERROR_CODES.EVALUATION_NOT_FOUND,
        });
      }

      if (
        error instanceof Error &&
        (error.message === EVAL_ERROR_MESSAGES.NOT_AUTHORIZED ||
          error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE)
      ) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.FORBIDDEN,
          errorCode: API_ERROR_CODES.NOT_EVALUATION_REVIEWER,
        });
      }

      return next(error);
    }
  };

  listReviewees = async (
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

      const result = await this.evaluationsService.listReviewees(req.user);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === EVAL_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE) {
        return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: API_ERROR_MESSAGES.REVIEWER_NOT_EMPLOYEE,
          errorCode: API_ERROR_CODES.REVIEWER_NOT_EMPLOYEE,
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
      error.message.endsWith("must be a valid date") ||
      error.message.endsWith("must be an array of strings") ||
      error.message === "periodEnd must be on or after periodStart" ||
      error.message === "Request body is required" ||
      error.message === "No fields provided to update" ||
      error.message === EVAL_UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES ||
      error.message === EVAL_UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE ||
      error.message === EVAL_UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE
    );
  }
}
