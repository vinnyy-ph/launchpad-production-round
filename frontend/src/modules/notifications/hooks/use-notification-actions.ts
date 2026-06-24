import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  markAllNotificationsRead,
  setNotificationPinned,
  clearNotification,
  clearAllNotifications,
} from "../services/notifications.service";

/**
 * Bundles the notification-center mutations (mark-all-read, pin/unpin, clear, clear-all),
 * each invalidating the notifications query so the bell + list refresh.
 */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });
  const pin = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      setNotificationPinned(id, pinned),
    onSuccess: invalidate,
  });
  const clear = useMutation({
    mutationFn: clearNotification,
    onSuccess: invalidate,
  });
  const clearAll = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: invalidate,
  });

  return {
    markAllRead: markAllRead.mutate,
    setPinned: (id: string, pinned: boolean) => pin.mutate({ id, pinned }),
    clear: clear.mutate,
    clearAll: clearAll.mutate,
    isBusy:
      markAllRead.isPending ||
      pin.isPending ||
      clear.isPending ||
      clearAll.isPending,
  };
}
