import { useMutation } from "@tanstack/react-query";
import { fetchNoteSuggestions } from "../services/surveys.service";

/**
 * HR action: fetch 3 AI-drafted note options for a small team's supervisor. A mutation (not a
 * query) so it only fires when HR clicks "Suggest" — the model call isn't cheap and shouldn't
 * run on render.
 */
export function useNoteSuggestions(surveyId: string) {
  return useMutation({
    mutationFn: (input: { teamId: string; occurrenceId?: string }) =>
      fetchNoteSuggestions(surveyId, input),
  });
}
