import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { fetchRespondentAnswers } from "../services/surveys.service";

/** One named respondent's answers for an occurrence. Pass null ids to keep the query idle
 *  (e.g. while the dialog is closed). */
export function useRespondentAnswers(occurrenceId: string | null, employeeId: string | null) {
  return useQuery({
    queryKey: queryKeys.surveys.respondentAnswers(
      occurrenceId ?? "none",
      employeeId ?? "none",
    ),
    queryFn: () => fetchRespondentAnswers(occurrenceId as string, employeeId as string),
    enabled: !!occurrenceId && !!employeeId,
  });
}
