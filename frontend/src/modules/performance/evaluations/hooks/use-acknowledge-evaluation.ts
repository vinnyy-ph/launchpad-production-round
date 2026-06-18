import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { acknowledgeEvaluation } from "../services/evaluations.service";

/** Acknowledge a sent evaluation; refreshes the evaluations list on success. */
export function useAcknowledgeEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeEvaluation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.all }),
  });
}
