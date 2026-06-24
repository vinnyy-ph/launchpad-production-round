import type { NextFunction, Request, Response } from "express";
import { HTTP_STATUS_CODES, API_ERROR_MESSAGES } from "../../../../core/globals";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { ResultsService } from "./results.service";
import { ShareService } from "./share.service";
import { NoteSuggestionsService } from "./note-suggestions.service";

export class ResultsController {
  constructor(
    private readonly service = new ResultsService(),
    private readonly shareService = new ShareService(),
    private readonly noteSuggestionsService = new NoteSuggestionsService(),
  ) {}

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

  /**
   * POST /:id/results/share — HR-only. Sends a small anonymous team's results to its
   * supervisor. All gates (anonymous, small team, completed occurrence, resolvable
   * supervisor) are enforced server-side in ShareService.
   */
  shareSmallTeamResults = async (
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
      const body = (req.body ?? {}) as {
        teamId?: unknown;
        occurrenceId?: unknown;
        message?: unknown;
      };
      const teamId = body.teamId ? String(body.teamId) : null;
      const occurrenceId = body.occurrenceId ? String(body.occurrenceId) : null;
      const message = typeof body.message === "string" ? body.message : "";

      if (!teamId) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "teamId is required",
          errorCode: "TEAM_ID_REQUIRED",
        });
        return;
      }

      const result = await this.shareService.shareSmallTeamResults(
        id,
        occurrenceId,
        teamId,
        req.user.id,
        message,
      );

      res.status(HTTP_STATUS_CODES.OK).json(result);
    } catch (error) {
      this.handleError(error, res, next);
    }
  };

  /**
   * POST /:id/results/note-suggestions — HR-only. Returns 3 AI-drafted note options for the
   * small-team supervisor, built from the team's AGGREGATE results (never raw responses). Same
   * context gates as the share (anonymous + small team + resolvable supervisor), enforced in
   * NoteSuggestionsService. 503 AI_UNAVAILABLE if the model call fails.
   */
  suggestNotes = async (
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
      const body = (req.body ?? {}) as { teamId?: unknown; occurrenceId?: unknown };
      const teamId = body.teamId ? String(body.teamId) : null;
      const occurrenceId = body.occurrenceId ? String(body.occurrenceId) : null;

      if (!teamId) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: "teamId is required",
          errorCode: "TEAM_ID_REQUIRED",
        });
        return;
      }

      const result = await this.noteSuggestionsService.suggest({
        surveyId: id,
        occurrenceIdParam: occurrenceId,
        teamId,
        userId: req.user.id,
        role: req.user.role,
      });

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
      if (error.message === SURVEY_ERROR_MESSAGES.TEAM_NOT_FOUND) {
        res.status(HTTP_STATUS_CODES.NOT_FOUND).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.TEAM_NOT_FOUND,
          errorCode: "TEAM_NOT_FOUND",
        });
        return;
      }
      if (
        error.message === SURVEY_ERROR_MESSAGES.SHARE_NOT_ANONYMOUS ||
        error.message === SURVEY_ERROR_MESSAGES.SHARE_NOT_SMALL_TEAM
      ) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: error.message,
          errorCode:
            error.message === SURVEY_ERROR_MESSAGES.SHARE_NOT_ANONYMOUS
              ? "SHARE_NOT_ANONYMOUS"
              : "SHARE_NOT_SMALL_TEAM",
        });
        return;
      }
      if (error.message === SURVEY_ERROR_MESSAGES.SHARE_NOT_COMPLETED) {
        res.status(HTTP_STATUS_CODES.CONFLICT).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.SHARE_NOT_COMPLETED,
          errorCode: "SHARE_NOT_COMPLETED",
        });
        return;
      }
      if (error.message === SURVEY_ERROR_MESSAGES.SHARE_NO_SUPERVISOR) {
        res.status(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.SHARE_NO_SUPERVISOR,
          errorCode: "SHARE_NO_SUPERVISOR",
        });
        return;
      }
      if (error.message === SURVEY_ERROR_MESSAGES.SHARE_ACTOR_NOT_EMPLOYEE) {
        res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
          success: false,
          message: SURVEY_ERROR_MESSAGES.SHARE_ACTOR_NOT_EMPLOYEE,
          errorCode: "SHARE_ACTOR_NOT_EMPLOYEE",
        });
        return;
      }
      if (
        error.message === SURVEY_ERROR_MESSAGES.SHARE_MESSAGE_REQUIRED ||
        error.message === SURVEY_ERROR_MESSAGES.SHARE_MESSAGE_TOO_LONG
      ) {
        res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: error.message,
          errorCode:
            error.message === SURVEY_ERROR_MESSAGES.SHARE_MESSAGE_REQUIRED
              ? "SHARE_MESSAGE_REQUIRED"
              : "SHARE_MESSAGE_TOO_LONG",
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
}
