import { Role } from "@prisma/client";
import type { AddUserRequestDto, GetUserParamsDto, ListUsersQueryDto, UpdateRoleRequestDto } from "./dto";
import { ADD_USER_ALLOWED_ROLES, UPDATE_ROLE_ALLOWED_ROLES, USER_FIELDS, USER_SORT_FIELDS, USER_SORT_ORDERS } from "./users.constants";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UsersValidation {
  /**
   * Validates and normalizes the POST /api/v1/users request body.
   */
  parseAddUserBody(body: Record<string, unknown>): AddUserRequestDto {
    const email = this.parseRequiredString(body.email, USER_FIELDS.EMAIL);
    const role = this.parseAddUserRole(body.role);
    const firstName = this.parseRequiredString(body.firstName, USER_FIELDS.FIRST_NAME);
    const lastName = this.parseRequiredString(body.lastName, USER_FIELDS.LAST_NAME);

    const normalizedEmail = email.toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new Error(`Invalid ${USER_FIELDS.EMAIL}`);
    }

    return {
      email: normalizedEmail,
      role,
      firstName,
      lastName,
    };
  }

  /**
   * Validates route params for user-specific endpoints.
   */
  parseUserIdParam(params: Record<string, unknown>): GetUserParamsDto {
    const userId = this.parseRequiredString(params.userId, USER_FIELDS.USER_ID);
    return { userId };
  }

  /**
   * Validates and normalizes the PATCH /api/v1/users/:userId/role request body.
   */
  parseUpdateRoleBody(body: Record<string, unknown>): UpdateRoleRequestDto {
    const role = this.parseUpdateRole(body.role);

    return { role };
  }

  /**
   * Converts raw query parameters into a typed list filter DTO.
   */
  parseListFilters(query: Record<string, unknown>): ListUsersQueryDto {
    const page = this.parsePositiveInteger(query.page, DEFAULT_PAGE);
    const limit = Math.min(this.parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const role = this.parseOptionalRole(query.role);
    const isActive = this.parseOptionalBoolean(query.isActive);
    const includeDeactivated = this.parseOptionalBoolean(query.includeDeactivated) ?? false;
    const sortBy = this.parseSortBy(query.sortBy);
    const sortOrder = this.parseSortOrder(query.sortOrder);

    return {
      page,
      limit,
      role,
      isActive,
      includeDeactivated,
      sortBy,
      sortOrder,
    };
  }

  private parseAddUserRole(value: unknown): AddUserRequestDto["role"] {
    const role = this.parseRequiredString(value, USER_FIELDS.ROLE).toUpperCase();

    if (!ADD_USER_ALLOWED_ROLES.includes(role as (typeof ADD_USER_ALLOWED_ROLES)[number])) {
      throw new Error("Invalid user role");
    }

    return role as AddUserRequestDto["role"];
  }

  private parseUpdateRole(value: unknown): UpdateRoleRequestDto["role"] {
    const role = this.parseRequiredString(value, USER_FIELDS.ROLE).toUpperCase();

    if (!UPDATE_ROLE_ALLOWED_ROLES.includes(role as (typeof UPDATE_ROLE_ALLOWED_ROLES)[number])) {
      throw new Error("Invalid user role");
    }

    return role as UpdateRoleRequestDto["role"];
  }

  private parseOptionalRole(value: unknown): Role | undefined {
    const role = this.parseOptionalString(value)?.toUpperCase();

    if (!role) {
      return undefined;
    }

    if (!Object.values(Role).includes(role as Role)) {
      throw new Error("Invalid user role");
    }

    return role as Role;
  }

  private parseSortBy(
    value: unknown,
  ): ListUsersQueryDto["sortBy"] | undefined {
    const sortBy = this.parseOptionalString(value)?.toLowerCase();

    if (!sortBy) {
      return undefined;
    }

    if (!USER_SORT_FIELDS.includes(sortBy as (typeof USER_SORT_FIELDS)[number])) {
      throw new Error("Invalid sort field");
    }

    return sortBy as ListUsersQueryDto["sortBy"];
  }

  private parseSortOrder(
    value: unknown,
  ): ListUsersQueryDto["sortOrder"] | undefined {
    const sortOrder = this.parseOptionalString(value)?.toLowerCase();

    if (!sortOrder) {
      return undefined;
    }

    if (!USER_SORT_ORDERS.includes(sortOrder as (typeof USER_SORT_ORDERS)[number])) {
      throw new Error("Invalid sort order");
    }

    return sortOrder as ListUsersQueryDto["sortOrder"];
  }

  private parseRequiredString(value: unknown, fieldName: string): string {
    const parsed = this.parseOptionalString(value);

    if (!parsed) {
      throw new Error(`${fieldName} is required`);
    }

    return parsed;
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private parsePositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "string") {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }

    return undefined;
  }
}
