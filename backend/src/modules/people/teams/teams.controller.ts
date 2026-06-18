
import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponseDto } from "../../../core/dto";
import { API_ERROR_CODES, API_ERROR_MESSAGES, HTTP_STATUS_CODES } from "../../../core/globals";
import type { ListTeamsResponseDto, TeamResponseDto } from "./dto";
import { TeamsService } from "./teams.service";
import { TeamsValidation } from "./teams.validation";

/**
 * HTTP controller for team management endpoints.
 */
export class TeamsController {
  constructor(
    private readonly teamsService = new TeamsService(),
    private readonly teamsValidation = new TeamsValidation(),
  ) {}

  /**
   * Handles GET /api/v1/teams.
   */
  listTeams = async (
    req: Request,
    res: Response<ListTeamsResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const filters = this.teamsValidation.parseListTeamsQuery(req.query);
      const result = await this.teamsService.listTeams(filters);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Handles POST /api/v1/teams.
   */
  createTeam = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const body = this.teamsValidation.parseCreateTeamBody(req.body);
      const result = await this.teamsService.createTeam(body);

      return res.status(HTTP_STATUS_CODES.CREATED).json(result);
    } catch (error) {
      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /**
   * Handles PATCH /api/v1/teams/:teamId.
   */
  updateTeamName = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.teamsValidation.parseTeamParams(req.params);
      const body = this.teamsValidation.parseUpdateTeamNameBody(req.body);
      const result = await this.teamsService.updateTeamName(params, body);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Team not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(this.toTeamNotFoundResponse(error.message));
      }

      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /**
   * Handles POST /api/v1/teams/:teamId/members.
   */
  addTeamMembers = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.teamsValidation.parseTeamParams(req.params);
      const body = this.teamsValidation.parseAddMembersBody(req.body);
      const result = await this.teamsService.addTeamMembers(params, body);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Team not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(this.toTeamNotFoundResponse(error.message));
      }

      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /**
   * Handles PUT /api/v1/teams/:teamId/members.
   */
  updateTeamMembers = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.teamsValidation.parseTeamParams(req.params);
      const body = this.teamsValidation.parseUpdateMembersBody(req.body);
      const result = await this.teamsService.updateTeamMembers(params, body);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Team not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(this.toTeamNotFoundResponse(error.message));
      }

      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /**
   * Handles DELETE /api/v1/teams/:teamId/members/:employeeId.
   */
  removeTeamMember = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.teamsValidation.parseTeamMemberParams(req.params);
      const result = await this.teamsService.removeTeamMember(params);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Team not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(this.toTeamNotFoundResponse(error.message));
      }

      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /**
   * Handles DELETE /api/v1/teams/:teamId/members.
   */
  removeTeamMembers = async (
    req: Request,
    res: Response<TeamResponseDto | ApiErrorResponseDto>,
    next: NextFunction,
  ) => {
    try {
      const params = this.teamsValidation.parseTeamParams(req.params);
      const body = this.teamsValidation.parseRemoveMembersBody(req.body);
      const result = await this.teamsService.removeTeamMembers(params, body);

      return res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Team not found") {
        return res.status(HTTP_STATUS_CODES.NOT_FOUND).json(this.toTeamNotFoundResponse(error.message));
      }

      if (this.isValidationError(error)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json(this.toValidationResponse(error.message));
      }

      return next(error);
    }
  };

  /** Identifies validation failures controlled by the teams module. */
  private isValidationError(error: unknown): error is Error {
    return (
      error instanceof Error &&
      [
        "Team id is required",
        "Team name is required",
        "Team leader is required",
        "Employee id is required",
        "At least one team member is required",
        "One or more employees were not found",
        "Team leader cannot be removed",
      ].includes(error.message)
    );
  }

  /** Builds a consistent validation error response for team endpoints. */
  private toValidationResponse(message: string): ApiErrorResponseDto {
    return {
      success: false,
      message: API_ERROR_MESSAGES.VALIDATION_FAILED,
      errorCode: API_ERROR_CODES.INVALID_EMPLOYEE_PROFILE_UPDATE,
      errors: [
        {
          field: "team",
          message,
          code: API_ERROR_CODES.INVALID_EMPLOYEE_PROFILE_UPDATE,
        },
      ],
    };
  }

  /** Builds a consistent not-found response for team endpoints. */
  private toTeamNotFoundResponse(message: string): ApiErrorResponseDto {
    return {
      success: false,
      message: API_ERROR_MESSAGES.NOT_FOUND,
      errorCode: API_ERROR_CODES.EMPLOYEE_NOT_FOUND,
      errors: [{ field: "teamId", message, code: API_ERROR_CODES.EMPLOYEE_NOT_FOUND }],
    };
  }
}
