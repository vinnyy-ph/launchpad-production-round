import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { sendEvaluation } from "../services/evaluations.service";

export function useSendEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendEvaluation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.all }),
  });
}
