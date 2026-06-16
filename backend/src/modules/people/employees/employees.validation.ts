import { EmployeeStatus } from "@prisma/client";
import type { ListEmployeesQueryDto } from "./dto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export class EmployeesValidation {
  /**
   * Converts raw Express query parameters into a typed DTO used by the employee list flow.
   * Empty strings are ignored, pagination defaults are applied, and status values are normalized.
   */
  parseListFilters(query: Record<string, unknown>): ListEmployeesQueryDto {
    const page = this.parsePositiveInteger(query.page, DEFAULT_PAGE);
    const limit = Math.min(this.parsePositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const status = this.parseEmployeeStatus(query.status);

    return {
      page,
      limit,
      search: this.parseOptionalString(query.search),
      status,
      teamId: this.parseOptionalString(query.teamId),
      team: this.parseOptionalString(query.team),
      supervisorId: this.parseOptionalString(query.supervisorId),
    };
  }

  /** Returns a trimmed string when present, otherwise leaves the optional filter unset. */
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

  /** Accepts lowercase or uppercase API status input and converts it to Prisma's enum value. */
  private parseEmployeeStatus(value: unknown): EmployeeStatus | undefined {
    const status = this.parseOptionalString(value)?.toUpperCase();

    if (!status) {
      return undefined;
    }

    if (!Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
      throw new Error("Invalid employee status");
    }

    return status as EmployeeStatus;
  }
}
