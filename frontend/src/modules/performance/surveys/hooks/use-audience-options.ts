import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchAudienceOptions } from "../services/surveys.service";

/** Selectable supervisors and teams for audience targeting. Enable only when needed. */
export function useAudienceOptions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.surveys.audienceOptions,
    queryFn: fetchAudienceOptions,
    enabled,
  });
}
