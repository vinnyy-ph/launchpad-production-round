import type { ApiSuccessResponseDto } from "../../../../../core/dto";

/** Employee profile fields shown during onboarding. */
export interface OnboardingProfileDto {
  firstName: string;
  lastName: string;
  middleName: string | null;
  personalEmail: string | null;
  birthday: string | null;
  address: string | null;
  emergencyContact: string | null;
  jobTitle: string | null;
  department: string | null;
}

/** Document submission status for one required onboarding document. */
export interface OnboardingDocumentStatusDto {
  id: string;
  documentName: string;
  instructions: string | null;
  allowedFileTypes: string;
  isRequired: boolean;
  latestSubmission: {
    id: string;
    fileUrl: string;
    status: "pending" | "approved" | "rejected";
    rejectionNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
  } | null;
}

/** Custom field with the employee's current answer, if any. */
export interface OnboardingCustomFieldStatusDto {
  id: string;
  fieldLabel: string;
  isRequired: boolean;
  value: string | null;
}

/** Full onboarding checklist returned to the employee. */
export interface OnboardingStatusDataDto {
  recordId: string;
  isComplete: boolean;
  completedAt: string | null;
  invitationStatus: "pending" | "accepted" | "expired" | "failed_delivery" | null;
  profile: OnboardingProfileDto;
  documents: OnboardingDocumentStatusDto[];
  customFields: OnboardingCustomFieldStatusDto[];
}

/**
 * Success envelope returned by GET /api/v1/employee-onboarding/status.
 */
export type OnboardingStatusResponseDto =
  ApiSuccessResponseDto<OnboardingStatusDataDto>;
