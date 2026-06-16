import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "../services/notifications.service";
import { NOTIFICATIONS_KEY } from "./use-notifications";

export function useMarkRead(onSuccess?: (id: string) => void) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      onSuccess?.(id);
    },
  });

  return { markRead: mutation.mutate };
}
