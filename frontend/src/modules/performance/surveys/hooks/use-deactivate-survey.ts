import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { deactivateSurvey } from "../services/surveys.service";

export function useDeactivateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateSurvey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all }),
  });
}
