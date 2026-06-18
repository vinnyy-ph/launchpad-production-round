import type { ApiSuccessResponseDto } from "../../../../../core/dto";
import type { SupervisorOnboardingEmployeeDto } from "./supervisor-onboarding-employee.dto";

/** Response payload for GET /api/v1/supervisor-onboarding/status. */
export interface SupervisorOnboardingStatusResponseDto
  extends ApiSuccessResponseDto<SupervisorOnboardingEmployeeDto[]> {}
