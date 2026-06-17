import { readCollection, writeCollection } from "@/shared/mock/db";
import type { Notification } from "../types/notifications.types";

const COLLECTION = "notifications";

export async function fetchNotifications(employeeId: string, limit = 10): Promise<Notification[]> {
  const all = readCollection<Notification>(COLLECTION)
    .filter((n) => n.recipientEmployeeId === employeeId)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all.slice(0, limit);
}

export async function markNotificationRead(id: string): Promise<void> {
  const rows = readCollection<Notification>(COLLECTION).map((n) =>
    n.id === id ? { ...n, isRead: true } : n,
  );
  writeCollection(COLLECTION, rows);
}
