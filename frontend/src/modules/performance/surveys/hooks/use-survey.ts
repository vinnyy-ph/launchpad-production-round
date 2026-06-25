import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { getSurvey } from "../services/surveys.service";

/** Loads one survey's full detail. Disabled until an id is provided. */
export function useSurvey(id: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id ?? ""),
    queryFn: () => getSurvey(id as string),
    enabled: !!id,
  });
}
