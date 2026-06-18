import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/lib/query-keys";
import { submitResponse } from "../services/surveys.service";
import type { AnswerInput } from "../types/surveys.types";

/** Submit the signed-in employee's answers to a pulse occurrence. */
export function useSubmitResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { occurrenceId: string; answers: AnswerInput[] }) =>
      submitResponse(vars.occurrenceId, vars.answers),
    onSuccess: () => {
      // Drop the answered pulse from the employee's pending list.
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.mine });
    },
  });
}
