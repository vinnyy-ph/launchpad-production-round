import type { SUPERVISOR_ONBOARDING_STATUS_FILTERS } from "../supervisor-onboarding.constants";

/** Optional filters for GET /api/v1/supervisor-onboarding/status. */
export interface SupervisorOnboardingStatusQueryDto {
  /** Filter by onboarding progress: active onboarding or completed. */
  status?: (typeof SUPERVISOR_ONBOARDING_STATUS_FILTERS)[number];
  /** Maximum number of results to return. */
  limit: number;
  /** Page number for pagination (1-based). */
  page: number;
}
