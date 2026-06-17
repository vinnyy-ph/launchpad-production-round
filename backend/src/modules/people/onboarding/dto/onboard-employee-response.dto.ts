import type { ApiSuccessResponseDto } from "../../../../core/dto";

/**
 * Summary of the newly created employee returned after onboarding.
 */
export interface OnboardedEmployeeDto {
  id: string;
  companyEmail: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  personalEmail: string | null;
  birthday: string | null;
  address: string | null;
  emergencyContact: string | null;
  jobTitle: string;
  department: string;
  supervisor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: string;
}

/**
 * Summary of the onboarding record created for the new employee.
 */
export interface OnboardingRecordDto {
  id: string;
  isComplete: boolean;
  createdAt: Date;
}

/**
 * Summary of the invitation triggered for the new employee.
 */
export interface OnboardingInvitationDto {
  id: string;
  sentToEmail: string;
  status: string;
  sentAt: Date;
  expiresAt: Date;
}

/**
 * Combined data payload returned by the onboard employee endpoint.
 */
export interface OnboardEmployeeDataDto {
  employee: OnboardedEmployeeDto;
  onboardingRecord: OnboardingRecordDto;
  invitation: OnboardingInvitationDto;
}

/**
 * Success envelope returned by POST /api/v1/onboarding.
 */
export type OnboardEmployeeResponseDto = ApiSuccessResponseDto<OnboardEmployeeDataDto>;
