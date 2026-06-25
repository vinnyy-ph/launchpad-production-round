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

/** Number of hours before an onboarding invitation expires. */
export const INVITATION_EXPIRY_HOURS = 24;

/** Minimum seconds HR must wait before resending the same invitation. */
export const INVITATION_RESEND_COOLDOWN_SECONDS = 60;

/** Maximum resends allowed for one invitation in a rolling hour. */
export const INVITATION_RESEND_MAX_ATTEMPTS_PER_HOUR = 5;
