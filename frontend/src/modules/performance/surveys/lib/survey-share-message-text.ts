import {
  mapPeopleFieldTextError,
  validatePeopleFieldText,
} from "@/modules/people/people-text";
import { SURVEY_TEXT_LIMITS } from "../schemas/survey-form.schema";

const SHARE_MESSAGE_FALLBACK = "Please enter a valid message to the supervisor.";

/** Live onChange validation — profanity/XSS/length only (not required-empty). */
export function surveyShareMessageChangeError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  return mapPeopleFieldTextError(
    validatePeopleFieldText(value, "Message", SURVEY_TEXT_LIMITS.SHARE_MESSAGE),
    SHARE_MESSAGE_FALLBACK,
  );
}

/** Profanity, XSS, length, and required checks for the HR supervisor note. */
export function surveyShareMessageSubmitError(value: string): string | undefined {
  if (!value.trim()) return "A note for the supervisor is required.";
  return surveyShareMessageChangeError(value);
}
