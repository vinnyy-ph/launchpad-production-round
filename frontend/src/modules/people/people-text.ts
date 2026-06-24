import { containsUnsafeText } from "@/shared/lib/safe-text";

export const PEOPLE_TEXT_LIMITS = {
  NAME: 100,
  EMAIL: 254,
  JOB_TITLE: 150,
  DEPARTMENT_NAME: 100,
  TEAM_NAME: 100,
  ADDRESS_LINE: 200,
  LOCATION: 100,
  PHONE_DISPLAY: 50,
  CUSTOM_FIELD_LABEL: 200,
  CUSTOM_FIELD_VALUE: 1000,
  DOCUMENT_NAME: 200,
  DOCUMENT_INSTRUCTIONS: 2000,
  NOTE: 1000,
  CLEARANCE_TEMPLATE_NAME: 200,
  CLEARANCE_PURPOSE: 200,
  CLEARANCE_REQUIREMENTS: 1000,
} as const;

export function validatePeopleText(
  value: string,
  label: string,
  maxLen: number,
): string | undefined {
  if (value.length > maxLen) {
    return `${label} must be ${maxLen} characters or fewer.`;
  }
  if (containsUnsafeText(value)) {
    return `${label} must not contain HTML or special characters.`;
  }
  return undefined;
}
