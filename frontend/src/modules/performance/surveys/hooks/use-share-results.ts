import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shareSmallTeamResults } from "../services/surveys.service";

/**
 * HR action: send a small anonymous team's supervisor an open-text note about their results.
 * On success, the survey's results queries are invalidated so the "already shared" hint refreshes.
 */
export function useShareResults(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { teamId: string; occurrenceId?: string; message: string }) =>
      shareSmallTeamResults(surveyId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["surveys", "results", surveyId] }),
  });
}
