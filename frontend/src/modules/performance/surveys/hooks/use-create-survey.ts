import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { createSurvey } from "../services/surveys.service";
import type { CreateSurveyInput } from "../types/surveys.types";

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSurveyInput) => createSurvey(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all }),
  });
}
