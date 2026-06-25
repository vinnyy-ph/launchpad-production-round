import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchMySurveys } from "../services/surveys.service";

/** The signed-in employee's open pulse surveys to answer. */
export function useMySurveys() {
  return useQuery({
    queryKey: queryKeys.surveys.mine,
    queryFn: fetchMySurveys,
  });
}
