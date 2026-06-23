import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES, API_ERROR_MESSAGES } from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { RespondentsService } from "./respondents.service";

export class RespondentsController {
  constructor(private readonly service = new RespondentsService()) {}

  /** GET /occurrences/:occurrenceId/respondents — authorized drill-down name list (named surveys). */
  getRoster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: API_ERROR_MESSAGES.UNAUTHORIZED,
        });
        return;
      }

      const result = await this.service.getRoster(
        req.user.id,
        req.user.role,
        req.params.occurrenceId,
      );

      res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  /** GET /occurrences/:occurrenceId/respondents/:employeeId — one named respondent's answers. */
  getIndividualAnswers = async (
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

      const result = await this.service.getIndividualAnswers(
        req.user.id,
        req.user.role,
        req.params.occurrenceId,
        req.params.employeeId,
      );

      res.status(HTTP_STATUS_CODES.OK).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  private handleError(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof Error) {
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
    }
    next(error);
  }
}
