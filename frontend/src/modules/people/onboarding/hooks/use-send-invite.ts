import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { sendInvitation } from "../services/onboarding.service";

/** HR (re)sends the onboarding invitation for a record. */
export function useSendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recordId: string) => sendInvitation(recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all }),
  });
}
