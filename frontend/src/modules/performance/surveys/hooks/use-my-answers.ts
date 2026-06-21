import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchMyAnswers } from "../services/surveys.service";

/** The signed-in employee's own answers for one completed occurrence (PER-23).
 *  Pass null to keep the query idle (e.g. while the dialog is closed). */
export function useMyAnswers(occurrenceId: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys.mineAnswers(occurrenceId ?? "none"),
    queryFn: () => fetchMyAnswers(occurrenceId as string),
    enabled: !!occurrenceId,
  });
}
