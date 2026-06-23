import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shareSmallTeamResults } from "../services/surveys.service";

/**
 * HR action: share a small anonymous team's results with its supervisor. On success, the
 * survey's results queries are invalidated so the "already shared" hint refreshes.
 */
export function useShareResults(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { teamId: string; occurrenceId?: string }) =>
      shareSmallTeamResults(surveyId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["surveys", "results", surveyId] }),
  });
}
