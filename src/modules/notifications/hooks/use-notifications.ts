import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchNotifications } from "../services/notifications.service";

export function useNotifications(limit = 10) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notifications.list(limit),
    queryFn: () => fetchNotifications(limit),
    enabled: true,
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
