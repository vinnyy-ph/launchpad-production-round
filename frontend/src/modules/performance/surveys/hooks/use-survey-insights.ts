import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSurveyInsights } from "../services/surveys.service";

/** AI insight for a survey. Manually triggered: stays disabled until `enabled` is true. */
export function useSurveyInsights(surveyId: string, opts?: { enabled?: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.surveys.insights(surveyId),
    queryFn: () => fetchSurveyInsights(surveyId),
    enabled: !!surveyId && (opts?.enabled ?? false),
    staleTime: 5 * 60 * 1000,
  });

  /** Force a server-side regenerate, then replace the cache. */
  const regenerate = async () => {
    const fresh = await fetchSurveyInsights(surveyId, { refresh: true });
    qc.setQueryData(queryKeys.surveys.insights(surveyId), fresh);
    return fresh;
  };

  return { ...query, regenerate };
}
