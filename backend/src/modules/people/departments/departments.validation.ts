import {
  DEPARTMENT_NAME_MAX_LENGTH,
  DEPARTMENT_PAGINATION,
  DEPARTMENT_SORT_FIELDS,
} from "./departments.constants";
import type {
  CreateDepartmentRequestDto,
  DepartmentParamsDto,
  DepartmentSortBy,
  ListDepartmentsQueryDto,
  SortDirection,
  UpdateDepartmentRequestDto,
} from "./dto";

/**
 * Parses and normalizes raw Express input for the department endpoints.
 * Keeps transport-level validation out of the service so business logic stays focused.
 */
export class DepartmentsValidation {
  /** Converts raw query parameters into a typed list DTO with pagination defaults applied. */
  parseListFilters(query: Record<string, unknown>): ListDepartmentsQueryDto {
    const page = this.parsePositiveInteger(query.page, DEPARTMENT_PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      this.parsePositiveInteger(query.limit, DEPARTMENT_PAGINATION.DEFAULT_LIMIT),
      DEPARTMENT_PAGINATION.MAX_LIMIT,
    );

    return {
      page,
      limit,
      search: this.parseOptionalString(query.search),
      sortBy: this.parseSortBy(query.sortBy),
      sortDirection: this.parseSortDirection(query.sortDirection),
    };
  }

  /** Validates the create body and returns a trimmed name. */
  parseCreateBody(body: Record<string, unknown>): CreateDepartmentRequestDto {
    return { name: this.parseName(body.name) };
  }

  /** Validates the update body and returns a trimmed name. */
  parseUpdateBody(body: Record<string, unknown>): UpdateDepartmentRequestDto {
    return { name: this.parseName(body.name) };
  }

  /** Ensures a department id route param is present. */
  parseParams(params: Record<string, unknown>): DepartmentParamsDto {
    const departmentId = this.parseOptionalString(params.departmentId);

    if (!departmentId) {
      throw new Error("Department id is required");
    }

    return { departmentId };
  }

  /** Validates a required, non-empty, length-bounded department name. */
  private parseName(value: unknown): string {
    const name = this.parseOptionalString(value);

    if (!name) {
      throw new Error("Department name is required");
    }

    if (name.length > DEPARTMENT_NAME_MAX_LENGTH) {
      throw new Error("Department name is too long");
    }

    return name;
  }

  /** Returns a trimmed string when present, otherwise leaves the optional value unset. */
  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /** Parses positive pagination numbers while falling back for missing or invalid values. */
  private parsePositiveInteger(value: unknown, fallback: number): number {
    if (typeof value !== "string") {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  /** Accepts known department sort keys and ignores unsupported values. */
  private parseSortBy(value: unknown): DepartmentSortBy | undefined {
    const sortBy = this.parseOptionalString(value);
    return DEPARTMENT_SORT_FIELDS.includes(sortBy as DepartmentSortBy)
      ? (sortBy as DepartmentSortBy)
      : undefined;
  }

  /** Normalizes sort direction while defaulting invalid input to ascending behavior. */
  private parseSortDirection(value: unknown): SortDirection | undefined {
    const direction = this.parseOptionalString(value)?.toLowerCase();

    if (direction === "asc" || direction === "desc") {
      return direction;
    }

    return undefined;
  }
}
