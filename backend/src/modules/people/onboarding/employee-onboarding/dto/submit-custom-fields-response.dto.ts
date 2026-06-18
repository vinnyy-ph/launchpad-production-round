import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { OnboardingCustomFieldStatusDto } from "./onboarding-status-response.dto";

/**
 * Success envelope returned by POST /api/v1/employee-onboarding/custom-fields.
 */
export type SubmitCustomFieldsResponseDto = ApiSuccessResponseDto<
  OnboardingCustomFieldStatusDto[]
>;
