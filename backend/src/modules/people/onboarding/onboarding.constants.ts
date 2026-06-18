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
  EMPLOYEE_ID: "employeeId",
} as const;

/** Profile fields required before HR can mark onboarding complete. */
export const REQUIRED_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "personalEmail",
  "birthday",
  "address",
  "emergencyContact",
] as const;

/** Number of days before an onboarding invitation expires. */
export const INVITATION_EXPIRY_DAYS = 30;
