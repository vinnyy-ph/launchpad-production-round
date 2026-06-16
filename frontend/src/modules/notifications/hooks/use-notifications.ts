import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "../services/notifications.service";

export const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(limit = 10) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY, limit],
    queryFn: () => fetchNotifications(limit),
    // TODO: re-enable when /api/notifications route exists (Darben's backend module)
    enabled: false,
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    unreadCount,
    reload: refetch,
  };
}
