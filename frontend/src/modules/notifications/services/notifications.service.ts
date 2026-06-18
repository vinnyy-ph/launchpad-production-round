import { apiFetch } from "@/shared/lib/api-client";
import type { Notification } from "../types/notifications.types";

const BASE = "/api/v1/notifications";

interface ListNotificationsResponse {
  success: true;
  message: string;
  data: Notification[];
}

interface MarkAsReadResponse {
  success: true;
  message: string;
  data: Notification;
}

// `employeeId` is accepted for call-site compatibility but unused: the endpoint
// scopes results to the authenticated user's employee profile server-side.
export async function fetchNotifications(_employeeId: string, limit = 10): Promise<Notification[]> {
  const res = await apiFetch<ListNotificationsResponse>(`${BASE}?limit=${limit}`);
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch<MarkAsReadResponse>(`${BASE}/${id}/read`, { method: "PATCH" });
}
