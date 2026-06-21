import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES, API_ERROR_MESSAGES } from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { ResultsService } from "./results.service";

export class ResultsController {
  constructor(private readonly service = new ResultsService()) {}

  getSurveyResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const { id } = req.params;
      const teamId = req.query.teamId ? String(req.query.teamId) : null;
      const supervisorId = req.query.supervisorId ? String(req.query.supervisorId) : null;

      const result = await this.service.getResults(
        id,
        null,
        req.user.id,
        req.user.role,
        teamId,
        supervisorId,
      );

      res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  getOccurrenceResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const { occurrenceId } = req.params;
      const teamId = req.query.teamId ? String(req.query.teamId) : null;
      const supervisorId = req.query.supervisorId ? String(req.query.supervisorId) : null;

      // First fetch occurrence to get its surveyId
      const occurrence = await this.service["repo"].findOccurrence(occurrenceId);
      if (!occurrence) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
          errorCode: "OCCURRENCE_NOT_FOUND",
        });
        return;
      }

      const result = await this.service.getResults(
        occurrence.surveyId,
        occurrenceId,
        req.user.id,
        req.user.role,
        teamId,
        supervisorId,
      );

      res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  listViewableSurveys = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }
      const result = await this.service.listViewableSurveys(req.user.id, req.user.role);
      res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof Error) {
      if (error.message === SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.SURVEY_NOT_FOUND,
          errorCode: "SURVEY_NOT_FOUND",
        });
        return;
      }
      if (error.message === SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND,
          errorCode: "OCCURRENCE_NOT_FOUND",
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
      if (error.message === SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR) {
        res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR,
          errorCode: "RESULTS_FORBIDDEN_SMALL_TEAM_SUPERVISOR",
        });
        return;
      }
      if (error.message === SURVEY_ERROR_MESSAGES.BOTH_FILTERS_PROVIDED) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.BOTH_FILTERS_PROVIDED,
          errorCode: "BOTH_FILTERS_PROVIDED",
        });
        return;
      }
    }
    next(error);
  }
}
