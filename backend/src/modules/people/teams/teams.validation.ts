
import type {
  AddTeamMembersRequestDto,
  CreateTeamRequestDto,
  ListTeamsQueryDto,
  RemoveTeamMembersRequestDto,
  TeamMemberParamsDto,
  TeamParamsDto,
  UpdateTeamNameRequestDto,
  UpdateTeamMembersRequestDto,
} from "./dto";
import { assertSafeText } from "../../../core/validation/text-input";
import { PEOPLE_TEXT_LIMITS } from "../people-text-limits";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Normalizes and validates team route parameters and request bodies.
 */
export class TeamsValidation {
  /**
   * Parses pagination query parameters for the team list endpoint.
   * Invalid or missing values fall back to defaults, and limit is capped.
   */
  parseListTeamsQuery(query: Record<string, unknown>): ListTeamsQueryDto {
    return {
      page: this.parsePositiveInteger(query.page, DEFAULT_PAGE),
      limit: Math.min(this.parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT),
    };
  }

  /**
   * Parses a team id route parameter.
   */
  parseTeamParams(params: Record<string, unknown>): TeamParamsDto {
    const teamId = this.parseRequiredString(params.teamId, "Team id is required");
    return { teamId };
  }

  /**
   * Parses route parameters for endpoints that target one team membership.
   */
  parseTeamMemberParams(params: Record<string, unknown>): TeamMemberParamsDto {
    return {
      teamId: this.parseRequiredString(params.teamId, "Team id is required"),
      employeeId: this.parseRequiredString(params.employeeId, "Employee id is required"),
    };
  }

  /**
   * Parses the request body used by HR to create a team.
   */
  parseCreateTeamBody(body: Record<string, unknown>): CreateTeamRequestDto {
    return {
      name: this.parseRequiredText(body.name, "name", "Team name is required", PEOPLE_TEXT_LIMITS.TEAM_NAME),
      leaderId: this.parseRequiredString(body.leaderId, "Team leader is required"),
      memberIds: this.parseStringArray(body.memberIds),
    };
  }

  /**
   * Parses the name-only update body for team identity edits.
   */
  parseUpdateTeamNameBody(body: Record<string, unknown>): UpdateTeamNameRequestDto {
    return {
      name: this.parseRequiredText(body.name, "name", "Team name is required", PEOPLE_TEXT_LIMITS.TEAM_NAME),
    };
  }

  /**
   * Parses a request to add members without replacing existing memberships.
   */
  parseAddMembersBody(body: Record<string, unknown>): AddTeamMembersRequestDto {
    const memberIds = this.parseStringArray(body.memberIds);

    if (memberIds.length === 0) {
      throw new Error("At least one team member is required");
    }

    return { memberIds };
  }

  /**
   * Parses a request to remove members without replacing the full membership list.
   */
  parseRemoveMembersBody(body: Record<string, unknown>): RemoveTeamMembersRequestDto {
    const memberIds = this.parseStringArray(body.memberIds);

    if (memberIds.length === 0) {
      throw new Error("At least one team member is required");
    }

    return { memberIds };
  }

  /**
   * Parses a complete member replacement request.
   */
  parseUpdateMembersBody(body: Record<string, unknown>): UpdateTeamMembersRequestDto {
    return {
      memberIds: this.parseStringArray(body.memberIds),
    };
  }

  /** Reads a non-empty string field from unknown request input. */
  private parseRequiredString(value: unknown, message: string): string {
    if (typeof value !== "string") {
      throw new Error(message);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      throw new Error(message);
    }

    return trimmed;
  }

  /** Reads a non-empty free-text field and applies stored-text safety checks. */
  private parseRequiredText(
    value: unknown,
    field: string,
    message: string,
    maxLen: number,
  ): string {
    const parsed = this.parseRequiredString(value, message);
    assertSafeText(parsed, field, maxLen);
    return parsed;
  }

  /** Parses a positive integer query parameter with a safe fallback. */
  private parsePositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "string") {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  /** Reads a string array and removes duplicate ids while preserving user selection order. */
  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(normalized));
  }
}
