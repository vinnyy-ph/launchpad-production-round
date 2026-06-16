import { markNotificationRead } from "../services/notifications.service";

export function useMarkRead(onSuccess?: (id: string) => void) {
  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      onSuccess?.(id);
    } catch {
      // fire-and-forget — swallow errors
    }
  };
  return { markRead };
}
