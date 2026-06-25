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

interface MessageResponse {
  success: true;
  message: string;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch<MessageResponse>(`${BASE}/read-all`, { method: "PATCH" });
}

export async function setNotificationPinned(id: string, pinned: boolean): Promise<void> {
  await apiFetch<MarkAsReadResponse>(`${BASE}/${id}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });
}

export async function clearNotification(id: string): Promise<void> {
  await apiFetch<MessageResponse>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function clearAllNotifications(): Promise<void> {
  await apiFetch<MessageResponse>(BASE, { method: "DELETE" });
}
