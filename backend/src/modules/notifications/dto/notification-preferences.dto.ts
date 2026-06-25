import type { EffectiveNotificationPreferences } from "../notification-categories";

/**
 * Response envelope for GET/PATCH /api/v1/notifications/preferences. `data` always
 * carries the full resolved preference set (defaults applied), including the two
 * constant fields (`evaluationsInApp` true, `offboardingEmail` false) so the client can
 * render every toggle — locked or disabled — without special cases.
 */
export interface NotificationPreferencesResponseDto {
  success: true;
  message: string;
  data: EffectiveNotificationPreferences;
}
