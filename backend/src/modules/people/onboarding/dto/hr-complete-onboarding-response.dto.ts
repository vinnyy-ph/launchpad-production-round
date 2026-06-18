import type { ApiSuccessResponseDto } from "../../../../core/dto";

/** Summary returned when HR marks an employee's onboarding complete. */
export interface HrCompleteOnboardingDataDto {
  recordId: string;
  isComplete: boolean;
  completedAt: string;
  employeeStatus: "active";
}

/**
 * Success envelope returned by POST /api/v1/onboarding/:employeeId/complete.
 */
export type HrCompleteOnboardingResponseDto =
  ApiSuccessResponseDto<HrCompleteOnboardingDataDto>;
