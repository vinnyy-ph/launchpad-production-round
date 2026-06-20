import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchVisibleResultSurveys } from "../services/surveys.service";

/** Surveys the signed-in user is entitled to view results for. */
export function useVisibleResultSurveys() {
  return useQuery({
    queryKey: queryKeys.surveys.viewableResults,
    queryFn: fetchVisibleResultSurveys,
  });
}
