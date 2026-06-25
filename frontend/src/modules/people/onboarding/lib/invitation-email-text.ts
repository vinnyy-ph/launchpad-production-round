import {
  mapPeopleFieldTextError,
  PEOPLE_TEXT_LIMITS,
  validatePeopleNameLanguage,
  validatePeopleText,
} from "@/modules/people/people-text";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INVITATION_EMAIL_ERROR = "Enter a valid email address.";

export function validateInvitationEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return INVITATION_EMAIL_ERROR;

  const atIndex = trimmed.indexOf("@");
  const languageError =
    atIndex > 0
      ? validatePeopleNameLanguage(trimmed.slice(0, atIndex))
      : validatePeopleNameLanguage(trimmed);
  if (languageError) return languageError;

  const textError = mapPeopleFieldTextError(
    validatePeopleText(trimmed, "Work email", PEOPLE_TEXT_LIMITS.EMAIL),
    INVITATION_EMAIL_ERROR,
  );
  if (textError) return textError;

  if (!EMAIL_RE.test(trimmed)) return INVITATION_EMAIL_ERROR;
  return undefined;
}
