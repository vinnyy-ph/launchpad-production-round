/**
 * Request body for PATCH /api/v1/employee-onboarding/profile.
 * Employees confirm or edit HR pre-filled profile data.
 */
export interface UpdateProfileRequestDto {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  personalEmail?: string;
  birthday?: string;
  /** Street address line. */
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  /** Emergency contact person's name. */
  emergencyContactName?: string;
  /** Emergency contact phone (validated Philippine mobile, stored formatted). */
  emergencyContact?: string;
  /** Normalized Philippine mobile used for duplicate checks. Not sent by clients. */
  emergencyContactNormalizedPhone?: string;
}
