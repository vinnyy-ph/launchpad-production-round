import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** Summary returned when the employee submits onboarding for HR review. */
export interface CompleteOnboardingDataDto {
  recordId: string;
  isComplete: boolean;
  submittedForReview?: boolean;
  completedAt?: string;
  employeeStatus?: "active" | "onboarding";
}

/**
 * Success envelope returned by POST /api/v1/employee-onboarding/complete.
 */
export type CompleteOnboardingResponseDto =
  ApiSuccessResponseDto<CompleteOnboardingDataDto>;
