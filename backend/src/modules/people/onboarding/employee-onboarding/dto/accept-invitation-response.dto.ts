import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { OnboardingStatusDataDto } from "./onboarding-status-response.dto";

/**
 * Success envelope returned by POST /api/v1/employee-onboarding/accept-invitation.
 */
export type AcceptInvitationResponseDto =
  ApiSuccessResponseDto<OnboardingStatusDataDto>;
