import { apiFetch } from "@/shared/lib/api-client";
import type { Notification } from "../types/notifications.types";

export function fetchNotifications(limit = 10) {
  return apiFetch<Notification[]>(`/api/notifications?limit=${limit}`);
}

export function markNotificationRead(id: string) {
  return apiFetch<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}
