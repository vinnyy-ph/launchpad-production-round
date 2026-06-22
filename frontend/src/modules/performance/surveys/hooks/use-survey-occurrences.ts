import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSurveyOccurrences } from "../services/surveys.service";

/** All rounds of a recurring survey (HR only), newest first, for the results-page round picker. */
export function useSurveyOccurrences(surveyId: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys.occurrences(surveyId ?? ""),
    queryFn: () => fetchSurveyOccurrences(surveyId as string),
    enabled: !!surveyId,
  });
}
