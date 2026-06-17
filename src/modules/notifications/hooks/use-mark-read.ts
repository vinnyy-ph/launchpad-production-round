import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { markNotificationRead } from "../services/notifications.service";

export function useMarkRead(onSuccess?: (id: string) => void) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      onSuccess?.(id);
    },
  });

  return { markRead: mutation.mutate };
}
