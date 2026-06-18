import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchNotifications } from "../services/notifications.service";
import { useAuth } from "@/modules/auth/hooks/use-auth";

export function useNotifications(limit = 10) {
  const { appUser } = useAuth();
  const employeeId = appUser?.employeeId ?? "";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.notifications.list(employeeId, limit),
    queryFn: () => fetchNotifications(employeeId, limit),
    enabled: !!employeeId,
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
