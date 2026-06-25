import { apiFetch } from "@/shared/lib/api-client";
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
} from "../types/notification-preferences.types";

interface PreferencesResult {
  data: NotificationPreferences;
}

const BASE = "/api/v1/notifications/preferences";

/** Loads the signed-in employee's notification preferences (defaults applied server-side). */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await apiFetch<PreferencesResult>(BASE);
  return res.data;
}

/** Updates the signed-in employee's notification preferences; returns the resolved set. */
export async function updateNotificationPreferences(
  input: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  const res = await apiFetch<PreferencesResult>(BASE, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}
