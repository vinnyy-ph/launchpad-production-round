import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES, API_ERROR_MESSAGES } from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { SurveysValidation } from "../surveys.validation";
import { AiQuestionsService } from "./ai-questions.service";

export class AiQuestionsController {
  constructor(
    private readonly service = new AiQuestionsService(),
    private readonly validation = new SurveysValidation(),
  ) {}

  generateQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      let input;
      try {
        input = this.validation.parseGenerateQuestionsBody(req.body);
      } catch (validationError) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message:
            validationError instanceof Error
              ? validationError.message
              : API_ERROR_MESSAGES.VALIDATION_FAILED,
          errorCode: "VALIDATION_FAILED",
        });
        return;
      }

      const questions = await this.service.generate(input);
      res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: { questions } });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.AI_QUESTIONS_INVALID) {
          res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
            success: false,
            message: SURVEY_ERROR_MESSAGES.AI_QUESTIONS_INVALID,
            errorCode: "AI_QUESTIONS_INVALID",
          });
          return;
        }
        if (error.message === SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE) {
          res.status(HTTP_STATUS_CODES.SERVICE_UNAVAILABLE).json({
            success: false,
            message: SURVEY_ERROR_MESSAGES.AI_UNAVAILABLE,
            errorCode: "AI_UNAVAILABLE",
          });
          return;
        }
      }
      next(error);
    }
  };
}
