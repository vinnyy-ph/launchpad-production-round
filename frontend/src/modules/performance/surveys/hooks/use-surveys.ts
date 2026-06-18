import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchSurveys } from "../services/surveys.service";
import type { SurveyStatus } from "../types/surveys.types";

/** Loads all pulse surveys, optionally filtered by derived status. */
export function useSurveys(status?: SurveyStatus) {
  return useQuery({
    queryKey: queryKeys.surveys.list(status),
    queryFn: () => fetchSurveys(status),
  });
}
