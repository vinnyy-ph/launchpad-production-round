import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSurveyResults } from "../services/surveys.service";
import type { ResultsFilter } from "../types/surveys.types";

/** Aggregated results for a survey, re-fetched whenever the team/supervisor filter changes. */
export function useSurveyResults(surveyId: string, filter?: ResultsFilter) {
  const active = filter && (filter.teamId || filter.supervisorId) ? filter : undefined;
  return useQuery({
    queryKey: queryKeys.surveys.results(
      surveyId,
      active as Record<string, unknown> | undefined,
    ),
    queryFn: () => fetchSurveyResults(surveyId, active),
    enabled: !!surveyId,
  });
}
