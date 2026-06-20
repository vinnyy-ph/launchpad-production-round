import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchAnsweredSurveys } from "../services/surveys.service";

/** The signed-in employee's already-answered pulse surveys (history list). */
export function useAnsweredSurveys() {
  return useQuery({
    queryKey: queryKeys.surveys.mineAnswered,
    queryFn: fetchAnsweredSurveys,
  });
}
