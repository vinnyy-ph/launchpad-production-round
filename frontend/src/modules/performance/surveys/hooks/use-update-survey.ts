import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { updateSurvey } from "../services/surveys.service";
import type { UpdateSurveyInput } from "../types/surveys.types";

export function useUpdateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSurveyInput }) =>
      updateSurvey(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all }),
  });
}
