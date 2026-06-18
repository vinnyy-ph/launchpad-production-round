import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { deleteEvaluation } from "../services/evaluations.service";

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvaluation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.all }),
  });
}
