import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { deleteSurvey } from "../services/surveys.service";

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSurvey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all }),
  });
}
