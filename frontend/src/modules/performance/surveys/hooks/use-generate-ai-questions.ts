import { useMutation } from "@tanstack/react-query";
import { generateAiQuestions } from "../services/surveys.service";

/**
 * HR action: generate draft questions from a survey goal. A mutation (not a query) so it only fires
 * when HR clicks "Generate" — the model call isn't cheap and shouldn't run on render.
 */
export function useGenerateAiQuestions() {
  return useMutation({
    mutationFn: (input: { goal: string; count: number }) => generateAiQuestions(input),
  });
}
