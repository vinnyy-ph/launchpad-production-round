import type { SupervisorOnboardingStatusQueryDto } from "./dto";
import {
  DEFAULT_SUPERVISOR_ONBOARDING_LIMIT,
  MAX_SUPERVISOR_ONBOARDING_LIMIT,
  SUPERVISOR_ONBOARDING_FIELDS,
  SUPERVISOR_ONBOARDING_STATUS_FILTERS,
} from "./supervisor-onboarding.constants";

/**
 * Validates and normalizes incoming supervisor onboarding API payloads.
 */
export class SupervisorOnboardingValidation {
  /** Validates GET /api/v1/supervisor-onboarding/status query parameters. */
  parseStatusQuery(query: Record<string, unknown>): SupervisorOnboardingStatusQueryDto {
    const status = this.parseStatusFilter(query[SUPERVISOR_ONBOARDING_FIELDS.STATUS]);
    const limit = this.parseLimit(query[SUPERVISOR_ONBOARDING_FIELDS.LIMIT]);
    const page = this.parsePage(query[SUPERVISOR_ONBOARDING_FIELDS.PAGE]);

    return { status, limit, page };
  }

  private parseStatusFilter(
    value: unknown,
  ): SupervisorOnboardingStatusQueryDto["status"] {
    if (value === undefined || value === "") {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error(`Invalid ${SUPERVISOR_ONBOARDING_FIELDS.STATUS}`);
    }

    const normalized = value.trim().toLowerCase();

    if (
      !SUPERVISOR_ONBOARDING_STATUS_FILTERS.includes(
        normalized as (typeof SUPERVISOR_ONBOARDING_STATUS_FILTERS)[number],
      )
    ) {
      throw new Error(`Invalid ${SUPERVISOR_ONBOARDING_FIELDS.STATUS}`);
    }

    return normalized as SupervisorOnboardingStatusQueryDto["status"];
  }

  private parseLimit(value: unknown): number {
    if (value === undefined || value === "") {
      return DEFAULT_SUPERVISOR_ONBOARDING_LIMIT;
    }

    const limit = Number(value);

    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error(`Invalid ${SUPERVISOR_ONBOARDING_FIELDS.LIMIT}`);
    }

    return Math.min(limit, MAX_SUPERVISOR_ONBOARDING_LIMIT);
  }

  private parsePage(value: unknown): number {
    if (value === undefined || value === "") {
      return 1;
    }

    const page = Number(value);

    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid ${SUPERVISOR_ONBOARDING_FIELDS.PAGE}`);
    }

    return page;
  }
}
