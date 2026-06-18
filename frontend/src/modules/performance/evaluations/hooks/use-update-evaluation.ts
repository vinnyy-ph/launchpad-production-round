import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { updateEvaluation } from "../services/evaluations.service";
import type { EvaluationInput } from "../types/evaluations.types";

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EvaluationInput> }) =>
      updateEvaluation(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.all }),
  });
}
