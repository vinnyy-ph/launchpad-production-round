import type { UpdateNotificationPreferencesData } from "./notification-preferences.repository";

/** The boolean fields a client is allowed to set (locked/non-existent channels excluded). */
const EDITABLE_FIELDS = [
  "surveysInApp",
  "surveysEmail",
  "evaluationsEmail",
  "onboardingInApp",
  "onboardingEmail",
  "offboardingInApp",
  "pauseAllEmail",
] as const;

/**
 * Parses and validates the notification-preferences update body.
 */
export class NotificationPreferencesValidation {
  /**
   * Accepts a partial set of boolean toggles; ignores unknown and locked fields
   * (e.g. evaluations in-app). Throws when a supplied field is not a boolean or when
   * the body contains no editable field at all.
   */
  parseUpdateBody(
    body: Record<string, unknown>,
  ): UpdateNotificationPreferencesData {
    const result: UpdateNotificationPreferencesData = {};
    let provided = false;

    for (const field of EDITABLE_FIELDS) {
      const value = body?.[field];

      if (value === undefined) {
        continue;
      }

      if (typeof value !== "boolean") {
        throw new Error(`${field} must be a boolean`);
      }

      result[field] = value;
      provided = true;
    }

    if (!provided) {
      throw new Error("No notification preferences provided");
    }

    return result;
  }
}
