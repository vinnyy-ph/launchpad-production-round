import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { createEvaluation } from "../services/evaluations.service";
import type { EvaluationInput } from "../types/evaluations.types";

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, files }: { input: EvaluationInput; files?: File[] }) => createEvaluation(input, files ?? []),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.all }),
  });
}
