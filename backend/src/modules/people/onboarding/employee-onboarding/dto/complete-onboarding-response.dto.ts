import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** Summary returned when onboarding is marked complete. */
export interface CompleteOnboardingDataDto {
  recordId: string;
  isComplete: boolean;
  completedAt: string;
  employeeStatus: "active";
}

/**
 * Success envelope returned by POST /api/v1/employee-onboarding/complete.
 */
export type CompleteOnboardingResponseDto =
  ApiSuccessResponseDto<CompleteOnboardingDataDto>;
