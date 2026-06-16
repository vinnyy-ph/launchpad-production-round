import { useState, useEffect, useCallback } from "react";
import { fetchNotifications } from "../services/notifications.service";
import type { Notification } from "../types/notifications.types";

export function useNotifications(limit = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNotifications(limit);
      setNotifications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { void load(); }, [load]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, loading, error, unreadCount, reload: load };
}
