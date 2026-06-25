/**
 * Resolved notification preferences for the signed-in employee. Mirrors the backend
 * `EffectiveNotificationPreferences`: every channel toggle plus the two constant fields
 * (`evaluationsInApp` always true — acknowledgement notices can't be silenced;
 * `offboardingEmail` always false — no offboarding/clearance email exists), plus the
 * global `pauseAllEmail` switch.
 */
export interface NotificationPreferences {
  surveysInApp: boolean;
  surveysEmail: boolean;
  evaluationsInApp: boolean;
  evaluationsEmail: boolean;
  onboardingInApp: boolean;
  onboardingEmail: boolean;
  offboardingInApp: boolean;
  offboardingEmail: boolean;
  pauseAllEmail: boolean;
}

/** The subset of fields a user may change (locked/non-existent channels excluded). */
export type NotificationPreferencesUpdate = Partial<
  Pick<
    NotificationPreferences,
    | "surveysInApp"
    | "surveysEmail"
    | "evaluationsEmail"
    | "onboardingInApp"
    | "onboardingEmail"
    | "offboardingInApp"
    | "pauseAllEmail"
  >
>;
