import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { OnboardingProfileDto } from "./onboarding-status-response.dto";

/**
 * Success envelope returned by PATCH /api/v1/employee-onboarding/profile.
 */
export type UpdateProfileResponseDto = ApiSuccessResponseDto<OnboardingProfileDto>;
