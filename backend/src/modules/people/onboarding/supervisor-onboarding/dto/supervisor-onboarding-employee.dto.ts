/** Onboarding progress summary for one subordinate employee. */
export interface SupervisorOnboardingProgressDto {
  recordId: string;
  isComplete: boolean;
  completedAt: string | null;
  invitationStatus: "pending" | "accepted" | "expired" | "failed_delivery" | null;
  documentsSubmitted: number;
  documentsRequired: number;
  customFieldsFilled: number;
  customFieldsRequired: number;
}

/** One subordinate employee with onboarding status visible to their supervisor. */
export interface SupervisorOnboardingEmployeeDto {
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: string | null;
  /** Google profile picture URL; null when the account has no photo. */
  avatarUrl: string | null;
  status: "onboarding" | "completed";
  onboarding: SupervisorOnboardingProgressDto;
}
