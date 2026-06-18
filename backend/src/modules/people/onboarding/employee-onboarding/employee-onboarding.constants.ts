/**
 * Field names used in employee onboarding validation error responses.
 */
export const EMPLOYEE_ONBOARDING_FIELDS = {
  FIRST_NAME: "firstName",
  LAST_NAME: "lastName",
  MIDDLE_NAME: "middleName",
  PERSONAL_EMAIL: "personalEmail",
  BIRTHDAY: "birthday",
  ADDRESS: "address",
  EMERGENCY_CONTACT: "emergencyContact",
  DOCUMENT_ID: "documentId",
  FILE_URL: "fileUrl",
  FIELD_ID: "fieldId",
  VALUE: "value",
  FIELDS: "fields",
} as const;

/** Profile fields required before onboarding can be marked complete. */
export const REQUIRED_PROFILE_FIELDS = [
  EMPLOYEE_ONBOARDING_FIELDS.FIRST_NAME,
  EMPLOYEE_ONBOARDING_FIELDS.LAST_NAME,
  EMPLOYEE_ONBOARDING_FIELDS.PERSONAL_EMAIL,
  EMPLOYEE_ONBOARDING_FIELDS.BIRTHDAY,
  EMPLOYEE_ONBOARDING_FIELDS.ADDRESS,
  EMPLOYEE_ONBOARDING_FIELDS.EMERGENCY_CONTACT,
] as const;
