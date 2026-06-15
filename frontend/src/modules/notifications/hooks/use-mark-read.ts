import { markNotificationRead } from "../services/notifications.service";

export function useMarkRead(onSuccess?: (id: string) => void) {
  const markRead = async (id: string) => {
    await markNotificationRead(id);
    onSuccess?.(id);
  };
  return { markRead };
}
