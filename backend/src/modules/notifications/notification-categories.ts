import type { NotificationPreference, NotificationType } from "@prisma/client";

/**
 * The four human-facing notification categories shown in the settings UI. Every
 * NotificationType maps to exactly one. This map is the single source of truth shared
 * by the preferences API and the delivery-enforcement gates in NotificationsService.
 */
export type NotificationCategory =
  | "SURVEYS"
  | "EVALUATIONS"
  | "ONBOARDING"
  | "OFFBOARDING";

export const CATEGORY_BY_TYPE: Record<NotificationType, NotificationCategory> = {
  NEW_PULSE: "SURVEYS",
  PULSE_REMINDER: "SURVEYS",
  PULSE_RESULTS_SHARED: "SURVEYS",
  NEW_EVALUATION: "EVALUATIONS",
  EVAL_ACK_REMINDER: "EVALUATIONS",
  EVAL_DEEMED_ACK: "EVALUATIONS",
  ONBOARDING_INVITE: "ONBOARDING",
  ONBOARDING_COMPLETE: "ONBOARDING",
  ONBOARDING_STATUS: "ONBOARDING",
  OFFBOARDING_STARTED: "OFFBOARDING",
  OFFBOARDING_STATUS: "OFFBOARDING",
  CLEARANCE_SIGN_REQUEST: "OFFBOARDING",
  CLEARANCE_REJECTED: "OFFBOARDING",
};

/** Every notification type, derived from the map so the two never drift apart. */
export const ALL_NOTIFICATION_TYPES = Object.keys(
  CATEGORY_BY_TYPE,
) as NotificationType[];

/**
 * Per-employee preferences with defaults applied. Two fields are constants, not stored:
 * `evaluationsInApp` is always true (acknowledgement notices are never silenceable, so the
 * deemed-acknowledgement audit trail can't be missed) and `offboardingEmail` is always
 * false (no offboarding/clearance email is sent today).
 */
export interface EffectiveNotificationPreferences {
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

/** All-on defaults, used when an employee has no stored preferences row yet. */
export const DEFAULT_NOTIFICATION_PREFERENCES: EffectiveNotificationPreferences = {
  surveysInApp: true,
  surveysEmail: true,
  evaluationsInApp: true,
  evaluationsEmail: true,
  onboardingInApp: true,
  onboardingEmail: true,
  offboardingInApp: true,
  offboardingEmail: false,
  pauseAllEmail: false,
};

/** Resolves a stored row (or its absence) into effective preferences with defaults. */
export function resolveEffectivePreferences(
  row: NotificationPreference | null,
): EffectiveNotificationPreferences {
  if (!row) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  return {
    surveysInApp: row.surveysInApp,
    surveysEmail: row.surveysEmail,
    evaluationsInApp: true,
    evaluationsEmail: row.evaluationsEmail,
    onboardingInApp: row.onboardingInApp,
    onboardingEmail: row.onboardingEmail,
    offboardingInApp: row.offboardingInApp,
    offboardingEmail: false,
    pauseAllEmail: row.pauseAllEmail,
  };
}

/** Whether an in-app notification of this type should reach the recipient. */
export function isInAppEnabled(
  prefs: EffectiveNotificationPreferences,
  type: NotificationType,
): boolean {
  switch (CATEGORY_BY_TYPE[type]) {
    case "EVALUATIONS":
      return true; // Locked on — acknowledgement notices are never silenceable.
    case "SURVEYS":
      return prefs.surveysInApp;
    case "ONBOARDING":
      return prefs.onboardingInApp;
    case "OFFBOARDING":
      return prefs.offboardingInApp;
    default:
      return true;
  }
}

/** Whether an email of this type should be sent to the recipient. */
export function isEmailEnabled(
  prefs: EffectiveNotificationPreferences,
  type: NotificationType,
): boolean {
  if (prefs.pauseAllEmail) {
    return false;
  }

  switch (CATEGORY_BY_TYPE[type]) {
    case "SURVEYS":
      return prefs.surveysEmail;
    case "EVALUATIONS":
      return prefs.evaluationsEmail;
    case "ONBOARDING":
      return prefs.onboardingEmail;
    case "OFFBOARDING":
      return false; // No offboarding/clearance email exists today.
    default:
      return false;
  }
}

/**
 * The notification types whose in-app delivery is disabled for these preferences.
 * The list endpoint drops these server-side before serializing, so an opted-out
 * category never reaches the client (the bell, the badge count, or a socket refetch).
 */
export function suppressedInAppTypes(
  prefs: EffectiveNotificationPreferences,
): NotificationType[] {
  return ALL_NOTIFICATION_TYPES.filter((type) => !isInAppEnabled(prefs, type));
}
