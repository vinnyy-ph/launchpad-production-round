/**
 * Request body for POST /api/v1/onboarding.
 * Required fields must be present to onboard a new employee.
 * Optional pre-fill fields let HR populate profile data during onboarding.
 */
export interface OnboardEmployeeRequestDto {
  companyEmail: string;
  jobTitle: string;
  supervisorId: string;
  department: string;
  /** Optional personal email pre-filled by HR for the new hire to confirm or edit. */
  personalEmail?: string;
  /** Optional first name; defaults to the company email local-part when omitted. */
  firstName?: string;
  middleName?: string;
  /** Optional last name; defaults to an empty string when omitted. */
  lastName?: string;
  /** Optional ISO date string (e.g. 1995-06-15) validated before save. */
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
  /** Normalized Philippine mobile (639XXXXXXXXX) used for duplicate checks. Not sent by clients. */
  emergencyContactNormalizedPhone?: string;
}
