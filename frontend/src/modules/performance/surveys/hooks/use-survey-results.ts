import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSurveyResults } from "../services/surveys.service";
import type { ResultsFilter } from "../types/surveys.types";

/**
 * Aggregated results for one survey round, re-fetched when the team/supervisor filter or the
 * selected occurrence changes. With no occurrenceId the server reports on the latest round.
 */
export function useSurveyResults(
  surveyId: string,
  filter?: ResultsFilter,
  occurrenceId?: string,
) {
  const active = filter && (filter.teamId || filter.supervisorId) ? filter : undefined;
  return useQuery({
    queryKey: queryKeys.surveys.results(
      surveyId,
      active as Record<string, unknown> | undefined,
      occurrenceId,
    ),
    queryFn: () => fetchSurveyResults(surveyId, active, occurrenceId),
    enabled: !!surveyId,
  });
}
