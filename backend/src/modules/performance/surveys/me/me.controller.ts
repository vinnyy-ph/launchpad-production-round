import type { NextFunction, Request, Response } from "express";
import {
  API_ERROR_CODES,
  API_ERROR_MESSAGES,
  HTTP_STATUS_CODES,
  API_SUCCESS_MESSAGES,
} from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { MeService } from "./me.service";

export class MeController {
  constructor(private readonly service = new MeService()) {}

  getPendingSurveys = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const pendingSurveys = await this.service.getPendingSurveys(userId);

      res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: API_SUCCESS_MESSAGES.PENDING_SURVEYS_RETRIEVED,
        data: pendingSurveys,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE) {
          res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: API_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE,
            errorCode: API_ERROR_CODES.CREATOR_NOT_EMPLOYEE,
          });
          return;
        }
      }
      next(error);
    }
  };

  getAnsweredSurveys = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const answeredSurveys = await this.service.getAnsweredSurveys(userId);

      res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Answered surveys retrieved successfully",
        data: answeredSurveys,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE) {
          res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: API_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE,
            errorCode: API_ERROR_CODES.CREATOR_NOT_EMPLOYEE,
          });
          return;
        }
      }
      next(error);
    }
  };

  getMyAnswers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const answers = await this.service.getMyAnswers(userId, req.params.occurrenceId);

      res.status(HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Your answers retrieved successfully",
        data: answers,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === SURVEY_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE) {
          res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
            success: false,
            message: API_ERROR_MESSAGES.CREATOR_NOT_EMPLOYEE,
            errorCode: API_ERROR_CODES.CREATOR_NOT_EMPLOYEE,
          });
          return;
        }
        if (error.message === SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND) {
          res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
            success: false,
            message: API_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
            errorCode: API_ERROR_CODES.OCCURRENCE_NOT_FOUND,
          });
          return;
        }
      }
      next(error);
    }
  };
}
