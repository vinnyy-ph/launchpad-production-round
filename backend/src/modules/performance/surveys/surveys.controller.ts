import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto, ApiSuccessResponseDto } from "../../../core/dto";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
} from "../../../core/globals";
import type { ListSurveysResponseDto, SurveyDetailResponseDto, SurveyResponseDto } from "./dto";
import { SURVEY_ERROR_MESSAGES } from "./surveys.constants";
import { SurveysService } from "./surveys.service";
import { SurveysValidation } from "./surveys.validation";

export class SurveysController {
  constructor(
    private readonly surveysService = new SurveysService(),
    private readonly surveysValidation = new SurveysValidation(),
  ) {}

  listSurveys = async (
    req: Request,
    res: Response<ListSurveysResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const query = this.surveysValidation.parseListQuery(req.query as Record<string, unknown>);
      const result = await this.surveysService.list(query);

      return res.json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === SURVEY_ERROR_MESSAGES.INVALID_STATUS
      ) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: API_ERROR_CODES.VALIDATION_FAILED,
          errors: [{ field: "status", message: error.message, code: API_ERROR_CODES.VALIDATION_FAILED }],
        });
      }

      return next(error);
    }
  };

  getSurvey = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<SurveyDetailResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { surveyId } = req.params;
      const result = await this.surveysService.get(surveyId);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
          errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
        });
      }

      return next(error);
    }
  };

  updateSurvey = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<SurveyDetailResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { surveyId } = req.params;
      const input = this.surveysValidation.parseUpdateBody(req.body);
      const result = await this.surveysService.update(surveyId, input);

      return res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (this.isValidationError(error)) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: API_ERROR_MESSAGES.VALIDATION_FAILED,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [
              {
                field: "",
                message: error.message,
                code: API_ERROR_CODES.VALIDATION_FAILED,
              },
            ],
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED) {
          return res.status(HTTP_STATUS_CODES.CONFLICT).json({
            success: false,
            message: error.message,
            errorCode: API_ERROR_CODES.SURVEY_ALREADY_ACTIVATED,
          });
        }
      }

      return next(error);
    }
  };

  deleteSurvey = async (
    req: Request,
    res: Response<void | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { id } = req.params;
      await this.surveysService.delete(id);

      return res.status(HTTP_STATUS_CODES.NO_CONTENT).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED) {
          return res.status(HTTP_STATUS_CODES.CONFLICT).json({
            success: false,
            message: "Survey is already activated and cannot be modified or deleted",
            errorCode: API_ERROR_CODES.SURVEY_ALREADY_ACTIVATED,
          });
        }
      }

      return next(error);
    }
  };

  activateSurvey = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<SurveyDetailResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { id } = req.params;
      const result = await this.surveysService.activate(id);

      return res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVE) {
          return res.status(HTTP_STATUS_CODES.CONFLICT).json({
            success: false,
            message: "Survey is already active",
            errorCode: API_ERROR_CODES.SURVEY_ALREADY_ACTIVE,
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED) {
          return res.status(HTTP_STATUS_CODES.CONFLICT).json({
            success: false,
            message: SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED,
            errorCode: API_ERROR_CODES.SURVEY_ALREADY_ACTIVATED,
          });
        }
      }

      return next(error);
    }
  };

  deactivateSurvey = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<SurveyDetailResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const { id } = req.params;
      const result = await this.surveysService.deactivate(id);

      return res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          return res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
          });
        }

        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_INACTIVE) {
          return res.status(HTTP_STATUS_CODES.CONFLICT).json({
            success: false,
            message: "Survey is already inactive",
            errorCode: API_ERROR_CODES.SURVEY_ALREADY_INACTIVE,
          });
        }
      }

      return next(error);
    }
  };

  createSurvey = async (
    req: Request,
    res: Response<ApiSuccessResponseDto<SurveyResponseDto> | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
      }

      const input = this.surveysValidation.parseCreateBody(req.body);
      const result = await this.surveysService.create(input, req.user.id);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      if (error instanceof Error) {
        // Validation errors
        if (this.isValidationError(error)) {
          return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: API_ERROR_MESSAGES.VALIDATION_FAILED,
            errorCode: API_ERROR_CODES.VALIDATION_FAILED,
            errors: [
              {
                field: "",
                message: error.message,
                code: API_ERROR_CODES.VALIDATION_FAILED,
              },
            ],
          });
        }

        // HR user has no linked employee record
        if (error.message === SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE) {
          return res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: API_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE,
            errorCode: API_ERROR_CODES.CREATOR_NOT_EMPLOYEE,
          });
        }
      }

      return next(error);
    }
  };

  listOccurrences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "Invalid pagination parameters",
        });
        return;
      }

      const result = await this.surveysService.listOccurrences(id, { page, limit });
      res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: API_ERROR_CODES.SURVEY_NOT_FOUND,
          });
          return;
        }
      }
      next(error);
    }
  };

  private isValidationError(error: Error): boolean {
    const msg = error.message;
    if (msg === SURVEY_ERROR_MESSAGES.SURVEY_ALREADY_ACTIVATED) {
      return false;
    }
    return (
      msg === "Request body is required" ||
      msg === "name is required" ||
      msg === "name must be a non-empty string" ||
      msg === SURVEY_ERROR_MESSAGES.QUESTIONS_REQUIRED ||
      msg === SURVEY_ERROR_MESSAGES.INVALID_RECURRING_TYPE ||
      msg === SURVEY_ERROR_MESSAGES.INVALID_AUDIENCE_TYPE ||
      msg === SURVEY_ERROR_MESSAGES.INVALID_VISIBILITY ||
      msg.includes("orderIndex") ||
      msg.includes("questionText") ||
      msg.includes("question type") ||
      msg.includes("LINEAR_SCALE") ||
      msg.includes("MULTIPLE_CHOICE") ||
      msg.includes("CHECKBOX") ||
      msg.includes("audienceConfigs") ||
      msg.includes("reminderConfig") ||
      msg.includes("isAnonymous") ||
      msg.includes("isActive") ||
      msg.includes("releaseDate") ||
      msg.includes("deadline")
    );
  }
}
