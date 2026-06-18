import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { activateSurvey } from "../services/surveys.service";

export function useActivateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateSurvey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all }),
  });
}
