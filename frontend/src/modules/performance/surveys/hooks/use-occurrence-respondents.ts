import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchOccurrenceRespondents } from "../services/surveys.service";

/** Authorized drill-down name list for one occurrence. Pass null to keep the query idle
 *  (e.g. for anonymous surveys, which never expose individuals). */
export function useOccurrenceRespondents(occurrenceId: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys.respondents(occurrenceId ?? "none"),
    queryFn: () => fetchOccurrenceRespondents(occurrenceId as string),
    enabled: !!occurrenceId,
  });
}
