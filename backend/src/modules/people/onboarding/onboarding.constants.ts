/**
 * Field names used in onboarding validation error responses.
 */
export const ONBOARDING_FIELDS = {
  COMPANY_EMAIL: "companyEmail",
  JOB_TITLE: "jobTitle",
  SUPERVISOR_ID: "supervisorId",
  DEPARTMENT: "department",
  BIRTHDAY: "birthday",
  EMERGENCY_CONTACT: "emergencyContact",
} as const;

/** Number of days before an onboarding invitation expires. */
export const INVITATION_EXPIRY_DAYS = 30;
