import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES, API_ERROR_MESSAGES } from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { InsightsService } from "./insights.service";
import { InsightsRepository } from "./insights.repository";
import { OpenAiInsightGenerator } from "./insights.generator";
import type { SurveyInsightResponseDto } from "./insights.types";

export class InsightsController {
  constructor(
    private readonly service = new InsightsService(
      new InsightsRepository(),
      new OpenAiInsightGenerator(),
    ),
  ) {}

  getSurveyInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const { id } = req.params;
      const refresh = req.query.refresh === "true";

      const result = await this.service.generateInsights({
        surveyId: id,
        userId: req.user.id,
        role: req.user.role,
        refresh,
      });

      const body: SurveyInsightResponseDto = {
        success: true,
        data: {
          ...result,
          generatedAt: result.generatedAt ? result.generatedAt.toISOString() : null,
        },
      };
      res.status(HTTP_STATUS_CODES.OK).json(body);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
          res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND,
            errorCode: "SURVEY_NOT_FOUND",
          });
          return;
        }
        if (error.message === SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN) {
          res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN,
            errorCode: "RESULTS_FORBIDDEN",
          });
          return;
        }
      }
      next(error);
    }
  };
}
