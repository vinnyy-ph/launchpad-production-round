import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../services/notification-preferences.service";
import type { NotificationPreferencesUpdate } from "../types/notification-preferences.types";

/** Loads the signed-in employee's notification preferences. */
export function useNotificationPreferences() {
  const query = useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: getNotificationPreferences,
  });

  return {
    preferences: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}

/**
 * Saves notification preferences. On success refreshes the preferences and the
 * notification list (a newly-disabled category must drop from the bell immediately).
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: NotificationPreferencesUpdate) =>
      updateNotificationPreferences(input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.preferences, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  return {
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}
